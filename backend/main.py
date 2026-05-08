from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import db_manager
import joblib
import pandas as pd
from google import genai
import warnings
from datetime import datetime
from routing import routing_engine # <-- Importamos el motor OSRM
import json

warnings.filterwarnings("ignore", category=FutureWarning)

app = FastAPI(title="FleetMind AI API", description="Motor de Inteligencia Operativa")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = db_manager.get_db()

# --- CONFIGURACIÓN DE IA GENERATIVA ---
GOOGLE_API_KEY = "AIzaSyCWykOfNzb50jHD8I1M85wRCNhRRipiHDw" # ADVERTENCIA: Por seguridad, rota esta clave al terminar tu proyecto
client = genai.Client(api_key=GOOGLE_API_KEY)

# --- CARGA DE MODELOS LOCALES ---
try:
    modelo_fallas = joblib.load("modelo_fallas.joblib")
    modelo_anomalias = joblib.load("modelo_anomalias.joblib")
    print("🧠 Modelos de Predicción y Anomalías cargados.")
except Exception as e:
    print(f"⚠️ Error al cargar los modelos locales: {e}")
    modelo_fallas = None
    modelo_anomalias = None

class MensajeChat(BaseModel):
    mensaje: str
    rol: str
    referencia: str

# Destinos válidos para el ruteo (Simulados en tu área de Trujillo)
DESTINOS = {
    "taller norte": {"nombre": "Taller Norte", "lat": -8.1065, "lng": -79.0201},
    "almacen laredo": {"nombre": "Almacén Laredo", "lat": -8.1150, "lng": -79.0350},
    "parada sur": {"nombre": "Parada Sur", "lat": -8.1250, "lng": -79.0180},
    "taller sur": {"nombre": "Taller Sur", "lat": -8.1120, "lng": -79.0320}
}

@app.get("/")
def read_root():
    return {"status": "success", "mensaje": "API en línea"}

@app.get("/api/flota")
def obtener_flota():
    try:
        camiones_ref = db.collection(u'telemetria_flota')
        docs = camiones_ref.stream()
        
        flota = []
        for doc in docs:
            datos_camion = doc.to_dict()
            if 'ultima_actualizacion' in datos_camion:
                datos_camion['ultima_actualizacion'] = datos_camion['ultima_actualizacion'].isoformat()
            
            if modelo_fallas:
                input_fallas = pd.DataFrame([{
                    "kilometraje": datos_camion.get("kilometraje", 0),
                    "edad_motor_meses": datos_camion.get("edad_motor_meses", 0),
                    "horas_conduccion": datos_camion.get("horas_conduccion", 0),
                    "temperatura_motor": datos_camion.get("temperatura_motor", 0)
                }])
                pred = modelo_fallas.predict(input_fallas)[0]
                datos_camion["alerta_predictiva"] = "⚠️ Peligro de Falla" if pred == 1 else "✅ Operación Segura"

            if modelo_anomalias:
                consumo_minuto = datos_camion.get("consumo_instante", 0) 
                input_anomalias = pd.DataFrame([{
                    "consumo_por_minuto": consumo_minuto,
                    "velocidad": 45.0
                }])
                es_anomalo = modelo_anomalias.predict(input_anomalias)[0]
                datos_camion["anomalia_combustible"] = True if es_anomalo == -1 else False
            
            flota.append(datos_camion)
        return {"status": "success", "data": flota}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/incidentes")
def obtener_incidentes():
    try:
        # 1. Referencia a la colección de incidentes en Firestore
        incidentes_ref = db.collection(u'incidentes_flota').order_by(u'fecha_hora', direction=u'DESCENDING').limit(20)
        docs = incidentes_ref.stream()
        
        lista_incidentes = []
        for doc in docs:
            item = doc.to_dict()
            item['id'] = doc.id
            
            # 2. Convertimos la fecha de Firestore a un formato que JSON entienda
            if 'fecha_hora' in item:
                item['fecha_hora'] = item['fecha_hora'].isoformat()
            
            lista_incidentes.append(item)
            
        return {"status": "success", "data": lista_incidentes}
    except Exception as e:
        print(f"❌ Error al obtener incidentes: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/api/chat")
async def procesar_chat(req: MensajeChat):
    try:
        system_prompt = ""
        actualizacion_db = None

        if req.rol == "CONDUCTOR":
            doc_ref = db.collection(u'telemetria_flota').document(req.referencia)
            doc = doc_ref.get()
            if not doc.exists:
                return {"respuesta": "No tengo conexión con tu telemetría."}
            
            data = doc.to_dict()
            
            # --- 1. IA DETECTA LA INTENCIÓN ---
            lista_destinos = ', '.join(DESTINOS.keys())
            prompt_intencion = f"""
            El conductor dice: "{req.mensaje}".
            ¿Quiere cambiar su ruta a un nuevo destino? 
            Destinos válidos: {lista_destinos}.
            Responde ÚNICAMENTE en JSON: {{"quiere_ir": true/false, "destino": "nombre en minusculas" o null}}
            """
            
            resp_intencion = client.models.generate_content(
                model="gemini-3-flash-preview", contents=prompt_intencion
            ).text
            
            try:
                # Limpiamos el texto por si Gemini añade marcadores de bloque de código
                intencion_json = resp_intencion.replace('```json', '').replace('```', '').strip()
                intencion = json.loads(intencion_json)
            except:
                intencion = {"quiere_ir": False, "destino": None}

            # --- 2. EVALUACIÓN Y RUTEO ---
            if intencion.get('quiere_ir') and intencion.get('destino') in DESTINOS:
                destino_nuevo = DESTINOS[intencion['destino']]
                
                # Pedimos la ruta física a OSRM
                puntos_ruta, dist_km = routing_engine.obtener_ruta_optima(
                    data['ubicacion']['lat'], data['ubicacion']['lng'],
                    destino_nuevo['lat'], destino_nuevo['lng']
                )

                if puntos_ruta:
                    consumo_est = round(dist_km * 0.35, 2)
                    combustible_ok = data['combustible_actual_L'] >= consumo_est
                    motor_ok = data['estado_motor'] == 'Optimo'
                    
                    if not motor_ok:
                        viabilidad = "RECHAZADA. Peligro de falla mecánica."
                    elif not combustible_ok:
                        viabilidad = f"RECHAZADA. Combustible insuficiente (necesita {consumo_est}L)."
                    else:
                        viabilidad = "APROBADA."
                        
                        # SOLUCIÓN: Convertimos la lista de listas en lista de diccionarios para que Firebase lo acepte
                        puntos_firebase = [{"lat": p[0], "lng": p[1]} for p in puntos_ruta]
                        
                        actualizacion_db = {
                            "puntos_ruta": puntos_firebase,
                            "destino": destino_nuevo,
                            "distancia_restante_km": dist_km,
                            "mision": f"Ruta AI a {destino_nuevo['nombre']}",
                            "ultima_actualizacion": datetime.now()
                        }

                    system_prompt = f"""
                    Eres el asistente de {req.referencia}.
                    Nuevo destino: {destino_nuevo['nombre']} a {dist_km} km.
                    Consumo estimado: {consumo_est} L. Combustible actual: {data['combustible_actual_L']} L.
                    Estado motor: {data['estado_motor']}.
                    Resultado de evaluación: {viabilidad}
                    REGLAS:
                    1. Sé directo. No uses Markdown (ni asteriscos).
                    2. Explica si aprobaste o rechazaste la ruta según el combustible y motor.
                    3. Si aprobaste, dile que ya actualizaste el mapa.
                    """
                else:
                    system_prompt = "Dile al usuario que hubo un error de GPS al trazar la ruta."
            else:
                # Flujo normal de preguntas
                system_prompt = f"""
                Eres el asistente de {req.referencia}.
                Destino actual: {data['destino']['nombre']} a {data['distancia_restante_km']} km.
                Combustible: {data['combustible_actual_L']}L. Motor: {data['estado_motor']}.
                Consumo estimado = Distancia * 0.35L/km.
                REGLAS: Sé breve, no uses Markdown (asteriscos).
                """
        else:
            system_prompt = "Eres FleetMind AI, analista logístico. No uses Markdown."

        # --- 3. RESPUESTA FINAL ---
        response = client.models.generate_content(
            model="gemini-3-flash-preview", 
            contents=f"{system_prompt}\n\nPregunta: {req.mensaje}"
        )
        
        # Guardamos en base de datos SOLO si la IA aprobó la viabilidad
        if actualizacion_db:
            doc_ref.update(actualizacion_db)
            print(f"✅ RUTA ACTUALIZADA en Firebase para {req.referencia}")

        return {"respuesta": response.text}

    except Exception as e:
        print(f"❌ Error Chatbot: {e}")
        return {"respuesta": "Error de conexión con IA."}
    