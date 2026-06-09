import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import db_manager
import joblib
import pandas as pd
from openai import OpenAI
from dotenv import load_dotenv
import warnings
from datetime import datetime, timedelta
from routing import routing_engine
import json
import requests
import time

load_dotenv()
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

import traceback

# --- CONFIGURACIÓN DE IA GENERATIVA (OpenRouter + DeepSeek) ---
MODEL = os.getenv("OPENROUTER_MODEL")
client = None

print("=" * 60)
print("VERIFICACION DE CONFIGURACION OPENROUTER/DEEPSEEK")
print(f"  OPENROUTER_BASE_URL:  {os.getenv('OPENROUTER_BASE_URL') or 'NO DEFINIDO'}")
print(f"  OPENROUTER_API_KEY:   {('***' + os.getenv('OPENROUTER_API_KEY', '')[-8:]) if os.getenv('OPENROUTER_API_KEY') else 'NO DEFINIDO'}")
print(f"  OPENROUTER_MODEL:     {MODEL or 'NO DEFINIDO'}")

if os.getenv("OPENROUTER_API_KEY"):
    try:
        client = OpenAI(
            base_url=os.getenv("OPENROUTER_BASE_URL"),
            api_key=os.getenv("OPENROUTER_API_KEY"),
        )
        print(f"  client.base_url:      {client.base_url}")
        print("  [OK] Cliente IA inicializado correctamente.")
    except Exception as e:
        print(f"  [ERROR] Error al inicializar cliente IA: {e}")
else:
    print("  [AVISO] Chat IA deshabilitado (sin OPENROUTER_API_KEY). Resto del API funciona.")
print("=" * 60)

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

_coordenadas_cache = {}

def geocodificar_destino(nombre):
    """Convierte un nombre de lugar en coordenadas (nombre, lat, lng) usando Nominatim."""
    nombre_limpio = nombre.strip().lower()

    if nombre_limpio in _coordenadas_cache:
        print(f"   📦 Caché: {nombre_limpio} -> {_coordenadas_cache[nombre_limpio]}")
        return _coordenadas_cache[nombre_limpio]

    if nombre_limpio in DESTINOS:
        d = DESTINOS[nombre_limpio]
        resultado = (d["nombre"], d["lat"], d["lng"])
        _coordenadas_cache[nombre_limpio] = resultado
        return resultado

    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": nombre,
            "format": "json",
            "limit": 1,
            "countrycodes": "pe",
            "accept-language": "es"
        }
        headers = {"User-Agent": "FleetMindAI/1.0"}
        resp = requests.get(url, params=params, headers=headers, timeout=5)
        data = resp.json()

        if data and len(data) > 0:
            lat = float(data[0]["lat"])
            lng = float(data[0]["lon"])
            nombre_encontrado = data[0].get("display_name", nombre)
            resultado = (nombre_encontrado, lat, lng)
            _coordenadas_cache[nombre_limpio] = resultado
            print(f"   🌍 Nominatim: '{nombre}' -> {nombre_encontrado} ({lat}, {lng})")
            time.sleep(1.1)
            return resultado
        else:
            print(f"   ⚠️ Nominatim no encontró: '{nombre}'")
            return None
    except Exception as e:
        print(f"   ❌ Error geocodificando '{nombre}': {e}")
        return None

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
            
            # PREDICCIÓN DE FALLAS
            if modelo_fallas:
                input_fallas = pd.DataFrame([{
                    "kilometraje": datos_camion.get("kilometraje", 0),
                    "edad_motor_meses": datos_camion.get("edad_motor_meses", 0),
                    "horas_conduccion": datos_camion.get("horas_conduccion", 0),
                    "temperatura_motor": datos_camion.get("temperatura_motor", 0)
                }])
                pred = modelo_fallas.predict(input_fallas)[0]
                prob = modelo_fallas.predict_proba(input_fallas)[0]
                probabilidad = float(prob[1]) if pred == 1 else float(prob[0])
                
                resultado = "Peligro de Falla" if pred == 1 else "Operación Segura"
                datos_camion["alerta_predictiva"] = f"⚠️ {resultado}" if pred == 1 else f"✅ {resultado}"
                
                # GUARDAR PREDICCIÓN EN FIREBASE
                prediccion_doc = {
                    "id_vehiculo": datos_camion.get("id_camion"),
                    "tipo_prediccion": "Falla Mecánica",
                    "resultado": resultado,
                    "probabilidad": probabilidad,
                    "confianza": "Alta" if probabilidad > 0.8 else "Media" if probabilidad > 0.5 else "Baja",
                    "datos_entrada": {
                        "kilometraje": datos_camion.get("kilometraje", 0),
                        "edad_motor_meses": datos_camion.get("edad_motor_meses", 0),
                        "horas_conduccion": datos_camion.get("horas_conduccion", 0),
                        "temperatura_motor": datos_camion.get("temperatura_motor", 0)
                    },
                    "recomendacion": "Programar mantenimiento preventivo urgente" if pred == 1 else "Continuar operación normal",
                    "fecha_prediccion": datetime.now(),
                    "modelo_usado": "modelo_fallas.joblib",
                    "version_modelo": "1.0"
                }
                db.collection('predicciones').add(prediccion_doc)

            # DETECCIÓN DE ANOMALÍAS
            if modelo_anomalias:
                consumo_minuto = datos_camion.get("consumo_instante", 0) 
                input_anomalias = pd.DataFrame([{
                    "consumo_por_minuto": consumo_minuto,
                    "velocidad": 45.0
                }])
                es_anomalo = modelo_anomalias.predict(input_anomalias)[0]
                datos_camion["anomalia_combustible"] = True if es_anomalo == -1 else False
                
                # GUARDAR PREDICCIÓN DE ANOMALÍA
                if es_anomalo == -1:
                    prediccion_anomalia = {
                        "id_vehiculo": datos_camion.get("id_camion"),
                        "tipo_prediccion": "Anomalía Combustible",
                        "resultado": "Anomalía Detectada",
                        "probabilidad": 0.95,
                        "confianza": "Muy Alta",
                        "datos_entrada": {
                            "consumo_por_minuto": consumo_minuto,
                            "velocidad": 45.0
                        },
                        "recomendacion": "Inspeccionar tanque de combustible. Posible fuga o robo.",
                        "fecha_prediccion": datetime.now(),
                        "modelo_usado": "modelo_anomalias.joblib",
                        "version_modelo": "1.0"
                    }
                    db.collection('predicciones').add(prediccion_anomalia)
            
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
    if client is None:
        return {"respuesta": "El asistente IA no está configurado. Agrega OPENROUTER_API_KEY al archivo .env del backend."}
    try:
        print(f"\n📨 CHAT RECIBIDO: rol={req.rol}, ref={req.referencia}, mensaje=\"{req.mensaje[:80]}...\"")
        print(f"   MODEL configurado: {MODEL}")
        print(f"   Base URL: {client.base_url}")
        
        system_prompt = ""
        actualizacion_db = None

        if req.rol == "CONDUCTOR":
            doc_ref = db.collection(u'telemetria_flota').document(req.referencia)
            doc = doc_ref.get()
            if not doc.exists:
                print(f"   ⚠️ Documento {req.referencia} no encontrado en Firestore")
                return {"respuesta": "No tengo conexión con tu telemetría."}
            
            data = doc.to_dict()
            
            # --- 1. IA DETECTA LA INTENCIÓN ---
            prompt_intencion = f"""
            El conductor dice: "{req.mensaje}".
            Determina si quiere cambiar su ruta hacia un nuevo destino.
            Responde ÚNICAMENTE en JSON sin Markdown:
            {{"quiere_ir": true/false, "destino": "nombre completo del lugar" o null}}
            Si quiere ir a un lugar, escribe el nombre completo (ej: "Chao, Viru, La Libertad").
            Si no menciona un lugar concreto, pon false y null.
            """
            
            print(f"   🔄 LLAMADA 1/2 a OpenRouter (detección de intención)...")
            try:
                resp = client.chat.completions.create(
                    model=MODEL,
                    messages=[
                        {"role": "system", "content": "Responde UNICAMENTE en JSON valido, sin bloques de codigo ni markdown."},
                        {"role": "user", "content": prompt_intencion}
                    ]
                )
                resp_intencion = resp.choices[0].message.content
                print(f"   ✅ Respuesta intención recibida: {resp_intencion[:100]}...")
            except Exception as inner_e:
                print(f"   ❌ ERROR en llamada 1/2: {inner_e}")
                traceback.print_exc()
                return {"respuesta": "Error al contactar la IA (intención). Revisa los logs del servidor."}
            
            try:
                # Limpiamos el texto por si Gemini añade marcadores de bloque de código
                intencion_json = resp_intencion.replace('```json', '').replace('```', '').strip()
                intencion = json.loads(intencion_json)
            except:
                intencion = {"quiere_ir": False, "destino": None}

            # --- 2. EVALUACIÓN Y RUTEO ---
            if intencion.get('quiere_ir') and intencion.get('destino'):
                destino_nombre_raw = intencion['destino']
                print(f"   📍 Geocodificando destino: '{destino_nombre_raw}'...")
                geo = geocodificar_destino(destino_nombre_raw)

                if geo is None:
                    system_prompt = f"El conductor pidio ir a '{destino_nombre_raw}' pero no se encontro en el mapa. Dile que sea mas especifico (incluye distrito y provincia)."
                else:
                    nombre_destino, lat_dest, lng_dest = geo
                    destino_nuevo = {"nombre": nombre_destino, "lat": lat_dest, "lng": lng_dest}

                    puntos_ruta, dist_km = routing_engine.obtener_ruta_optima(
                        data['ubicacion']['lat'], data['ubicacion']['lng'],
                        lat_dest, lng_dest
                    )

                    if puntos_ruta:
                        consumo_est = round(dist_km * 0.35, 2)
                        combustible_ok = data['combustible_actual_L'] >= consumo_est
                        motor_ok = data['estado_motor'] == 'Optimo'

                        if dist_km > 200:
                            viabilidad = f"RECHAZADA. Destino a {dist_km} km, demasiado lejos (maximo 200 km por mision)."
                        elif not motor_ok:
                            viabilidad = "RECHAZADA. Peligro de falla mecanica."
                        elif not combustible_ok:
                            viabilidad = f"RECHAZADA. Combustible insuficiente (necesita {consumo_est}L, tienes {data['combustible_actual_L']}L)."
                        else:
                            viabilidad = "APROBADA."

                            puntos_firebase = [{"lat": p[0], "lng": p[1]} for p in puntos_ruta]

                            actualizacion_db = {
                                "puntos_ruta": puntos_firebase,
                                "destino": destino_nuevo,
                                "distancia_restante_km": dist_km,
                                "mision": f"Ruta AI a {nombre_destino}",
                                "ultima_actualizacion": datetime.now()
                            }

                        system_prompt = f"""
                        Eres el asistente de {req.referencia}.
                        Nuevo destino: {nombre_destino} a {dist_km} km.
                        Consumo estimado: {consumo_est} L. Combustible actual: {data['combustible_actual_L']} L.
                        Estado motor: {data['estado_motor']}.
                        Resultado de evaluacion: {viabilidad}
                        REGLAS:
                        1. Se directo. No uses Markdown (ni asteriscos).
                        2. Explica si aprobaste o rechazaste la ruta segun el combustible, motor y distancia.
                        3. Si el destino esta a mas de 200 km, explica que excede el limite de mision.
                        4. Si aprobaste, dile que ya actualizaste el mapa.
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
                REGLAS: Se breve, no uses Markdown (asteriscos).
                """
        else:
            system_prompt = "Eres FleetMind AI, analista logistico. No uses Markdown."

        # --- 3. RESPUESTA FINAL ---
        print(f"   🔄 LLAMADA 2/2 a OpenRouter (respuesta final)...")
        print(f"   System prompt (primeros 200 chars): {system_prompt[:200]}...")
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": req.mensaje}
                ]
            )
            respuesta_texto = response.choices[0].message.content
            print(f"   ✅ Respuesta final recibida: {respuesta_texto[:100]}...")
        except Exception as inner_e:
            print(f"   ❌ ERROR en llamada 2/2: {inner_e}")
            traceback.print_exc()
            return {"respuesta": "Error al generar respuesta con IA. Revisa los logs del servidor."}
        
        # Guardamos en base de datos SOLO si la IA aprobó la viabilidad
        if actualizacion_db:
            doc_ref.update(actualizacion_db)
            print(f"✅ RUTA ACTUALIZADA en Firebase para {req.referencia}")

        return {"respuesta": respuesta_texto}

    except Exception as e:
        print(f"❌ Error Chatbot (nivel superior): {type(e).__name__}: {e}")
        traceback.print_exc()
        return {"respuesta": f"Error de conexión con IA. ({type(e).__name__})"}
    

# ============================================================================
# ENDPOINTS CRUD - SEMANA 1
# ============================================================================

# --- MODELOS PYDANTIC PARA VALIDACIÓN ---
class VehiculoCreate(BaseModel):
    id_vehiculo: str
    placa: str
    marca: str
    modelo: str
    anio: int
    capacidad_tanque_L: float
    capacidad_carga_ton: float
    kilometraje_actual: float
    edad_motor_meses: int
    estado: str
    conductor_asignado: str

class VehiculoUpdate(BaseModel):
    placa: str | None = None
    marca: str | None = None
    modelo: str | None = None
    anio: int | None = None
    capacidad_tanque_L: float | None = None
    capacidad_carga_ton: float | None = None
    kilometraje_actual: float | None = None
    edad_motor_meses: int | None = None
    estado: str | None = None
    conductor_asignado: str | None = None

class ComponenteData(BaseModel):
    kilometraje_acumulado: float = 0.0
    tiempo_vida: float = 0.0
    ultima_reparacion: datetime | None = None
    proxima_reparacion: datetime | None = None

class ComponentesVehiculo(BaseModel):
    motor: ComponenteData | None = None
    aceite: ComponenteData | None = None
    neumaticos: ComponenteData | None = None
    zapatas: ComponenteData | None = None
    mangueras: ComponenteData | None = None
    fajas: ComponenteData | None = None

class ConductorCreate(BaseModel):
    id_conductor: str
    nombre: str
    licencia: str
    telefono: str
    email: str
    experiencia_anios: int
    calificacion: float

class ConductorUpdate(BaseModel):
    nombre: str | None = None
    licencia: str | None = None
    telefono: str | None = None
    email: str | None = None
    experiencia_anios: int | None = None
    calificacion: float | None = None
    estado: str | None = None

class ViajeIniciar(BaseModel):
    id_vehiculo: str
    origen_nombre: str
    origen_lat: float
    origen_lng: float
    destino_nombre: str
    destino_lat: float
    destino_lng: float
    km_inicio: float
    reposicion_origen_nombre: str | None = None
    reposicion_origen_lat: float | None = None
    reposicion_origen_lng: float | None = None
    reposicion_distancia_km: float | None = None
    ubicacion_inicial_lat: float | None = None
    ubicacion_inicial_lng: float | None = None
    ubicacion_inicial_nombre: str | None = None

class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    password: str
    telefono: str | None = None
    rol: str = "CONDUCTOR"
    id_conductor: str | None = None

class UsuarioLogin(BaseModel):
    email: str
    password: str

class UsuarioUpdate(BaseModel):
    nombre: str | None = None
    email: str | None = None
    password: str | None = None
    telefono: str | None = None
    rol: str | None = None

class ViajeFinalizar(BaseModel):
    id_vehiculo: str
    km_fin: float

# ============================================================================
# CRUD VEHÍCULOS
# ============================================================================

@app.get("/api/vehiculos")
def listar_vehiculos():
    """Obtener todos los vehículos"""
    try:
        vehiculos_ref = db.collection('vehiculos')
        docs = vehiculos_ref.stream()
        
        vehiculos = []
        for doc in docs:
            vehiculo = doc.to_dict()
            vehiculo['id'] = doc.id
            
            # Convertir fechas a ISO format
            if 'fecha_adquisicion' in vehiculo:
                vehiculo['fecha_adquisicion'] = vehiculo['fecha_adquisicion'].isoformat()
            if 'ultimo_mantenimiento' in vehiculo:
                vehiculo['ultimo_mantenimiento'] = vehiculo['ultimo_mantenimiento'].isoformat()
            
            vehiculos.append(vehiculo)
        
        return {"status": "success", "data": vehiculos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vehiculos/{id_vehiculo}")
def obtener_vehiculo(id_vehiculo: str):
    """Obtener un vehículo específico"""
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")
        
        vehiculo = doc.to_dict()
        vehiculo['id'] = doc.id
        
        # Convertir fechas
        if 'fecha_adquisicion' in vehiculo:
            vehiculo['fecha_adquisicion'] = vehiculo['fecha_adquisicion'].isoformat()
        if 'ultimo_mantenimiento' in vehiculo:
            vehiculo['ultimo_mantenimiento'] = vehiculo['ultimo_mantenimiento'].isoformat()
        
        return {"status": "success", "data": vehiculo}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vehiculos")
def crear_vehiculo(vehiculo: VehiculoCreate):
    """Crear un nuevo vehículo"""
    try:
        # Verificar si ya existe
        doc_ref = db.collection('vehiculos').document(vehiculo.id_vehiculo)
        if doc_ref.get().exists:
            raise HTTPException(status_code=400, detail="El vehículo ya existe")
        
        # Crear documento
        vehiculo_data = vehiculo.model_dump()
        vehiculo_data['fecha_adquisicion'] = datetime.now()
        vehiculo_data['ultimo_mantenimiento'] = datetime.now()
        vehiculo_data['proximo_mantenimiento_km'] = vehiculo.kilometraje_actual + 5000
        
        doc_ref.set(vehiculo_data)
        
        return {
            "status": "success",
            "mensaje": f"Vehículo {vehiculo.id_vehiculo} creado exitosamente",
            "data": {"id": vehiculo.id_vehiculo}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/vehiculos/{id_vehiculo}")
def actualizar_vehiculo(id_vehiculo: str, vehiculo: VehiculoUpdate):
    """Actualizar un vehículo existente"""
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")
        
        # Actualizar solo campos proporcionados
        update_data = {k: v for k, v in vehiculo.model_dump().items() if v is not None}
        
        if update_data:
            doc_ref.update(update_data)
        
        return {
            "status": "success",
            "mensaje": f"Vehículo {id_vehiculo} actualizado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/vehiculos/{id_vehiculo}")
def eliminar_vehiculo(id_vehiculo: str):
    """Eliminar un vehículo"""
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")
        
        doc_ref.delete()
        
        return {
            "status": "success",
            "mensaje": f"Vehículo {id_vehiculo} eliminado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# CRUD COMPONENTES (SUBCONLECCIÓN vehiculos/{id}/componentes)
# ============================================================================

@app.get("/api/vehiculos/{id_vehiculo}/componentes")
def obtener_componentes(id_vehiculo: str):
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")

        componentes_ref = db.collection('vehiculos').document(id_vehiculo).collection('componentes')
        docs = componentes_ref.stream()

        componentes = {}
        for doc in docs:
            data = doc.to_dict()
            if 'ultima_reparacion' in data and data['ultima_reparacion']:
                data['ultima_reparacion'] = data['ultima_reparacion'].isoformat()
            if 'proxima_reparacion' in data and data['proxima_reparacion']:
                data['proxima_reparacion'] = data['proxima_reparacion'].isoformat()
            componentes[doc.id] = data

        return {"status": "success", "data": componentes}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/vehiculos/{id_vehiculo}/componentes/{nombre_componente}")
def obtener_componente(id_vehiculo: str, nombre_componente: str):
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")

        comp_ref = db.collection('vehiculos').document(id_vehiculo).collection('componentes').document(nombre_componente)
        doc = comp_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail=f"Componente '{nombre_componente}' no encontrado")

        data = doc.to_dict()
        if 'ultima_reparacion' in data and data['ultima_reparacion']:
            data['ultima_reparacion'] = data['ultima_reparacion'].isoformat()
        if 'proxima_reparacion' in data and data['proxima_reparacion']:
            data['proxima_reparacion'] = data['proxima_reparacion'].isoformat()

        return {"status": "success", "data": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/vehiculos/{id_vehiculo}/componentes")
def actualizar_componentes(id_vehiculo: str, componentes: dict[str, ComponenteData]):
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")

        actualizados = []

        for nombre, data in componentes.items():
            if data is not None:
                comp_ref = db.collection('vehiculos').document(id_vehiculo).collection('componentes').document(nombre)
                comp_ref.set(data.model_dump(), merge=True)
                actualizados.append(nombre)

        return {
            "status": "success",
            "mensaje": f"Componentes actualizados: {', '.join(actualizados)}" if actualizados else "Sin cambios"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/vehiculos/{id_vehiculo}/componentes/{nombre_componente}")
def eliminar_componente(id_vehiculo: str, nombre_componente: str):
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")

        comp_ref = db.collection('vehiculos').document(id_vehiculo).collection('componentes').document(nombre_componente)
        if not comp_ref.get().exists:
            raise HTTPException(status_code=404, detail=f"Componente '{nombre_componente}' no encontrado")

        comp_ref.delete()

        return {
            "status": "success",
            "mensaje": f"Componente '{nombre_componente}' eliminado"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# CRUD CONDUCTORES
# ============================================================================

@app.get("/api/conductores")
def listar_conductores():
    """Obtener todos los conductores"""
    try:
        conductores_ref = db.collection('conductores')
        docs = conductores_ref.stream()
        
        conductores = []
        for doc in docs:
            conductor = doc.to_dict()
            conductor['id'] = doc.id
            
            # Convertir fechas
            if 'fecha_contratacion' in conductor:
                conductor['fecha_contratacion'] = conductor['fecha_contratacion'].isoformat()
            
            conductores.append(conductor)
        
        return {"status": "success", "data": conductores}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conductores/{id_conductor}")
def obtener_conductor(id_conductor: str):
    """Obtener un conductor específico"""
    try:
        doc_ref = db.collection('conductores').document(id_conductor)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Conductor no encontrado")
        
        conductor = doc.to_dict()
        conductor['id'] = doc.id
        
        # Convertir fechas
        if 'fecha_contratacion' in conductor:
            conductor['fecha_contratacion'] = conductor['fecha_contratacion'].isoformat()
        
        return {"status": "success", "data": conductor}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/conductores")
def crear_conductor(conductor: ConductorCreate):
    """Crear un nuevo conductor"""
    try:
        # Verificar si ya existe
        doc_ref = db.collection('conductores').document(conductor.id_conductor)
        if doc_ref.get().exists:
            raise HTTPException(status_code=400, detail="El conductor ya existe")
        
        # Crear documento
        conductor_data = conductor.model_dump()
        conductor_data['fecha_contratacion'] = datetime.now()
        conductor_data['estado'] = "Activo"
        
        doc_ref.set(conductor_data)
        
        return {
            "status": "success",
            "mensaje": f"Conductor {conductor.id_conductor} creado exitosamente",
            "data": {"id": conductor.id_conductor}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/conductores/{id_conductor}")
def actualizar_conductor(id_conductor: str, conductor: ConductorUpdate):
    """Actualizar un conductor existente"""
    try:
        doc_ref = db.collection('conductores').document(id_conductor)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Conductor no encontrado")
        
        # Actualizar solo campos proporcionados
        update_data = {k: v for k, v in conductor.model_dump().items() if v is not None}
        
        if update_data:
            doc_ref.update(update_data)
        
        return {
            "status": "success",
            "mensaje": f"Conductor {id_conductor} actualizado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/conductores/{id_conductor}")
def eliminar_conductor(id_conductor: str):
    """Eliminar un conductor"""
    try:
        doc_ref = db.collection('conductores').document(id_conductor)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Conductor no encontrado")
        
        doc_ref.delete()
        
        return {
            "status": "success",
            "mensaje": f"Conductor {id_conductor} eliminado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ENDPOINTS SEMANA 2 - PREDICCIONES, ALERTAS Y KPIS
# ============================================================================

# --- PREDICCIONES ---
@app.get("/api/predicciones")
def listar_predicciones():
    """Obtener todas las predicciones recientes"""
    try:
        predicciones_ref = db.collection('predicciones').order_by('fecha_prediccion', direction='DESCENDING').limit(50)
        docs = predicciones_ref.stream()
        
        predicciones = []
        for doc in docs:
            pred = doc.to_dict()
            pred['id'] = doc.id
            if 'fecha_prediccion' in pred:
                pred['fecha_prediccion'] = pred['fecha_prediccion'].isoformat()
            predicciones.append(pred)
        
        return {"status": "success", "data": predicciones}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/predicciones/{id_vehiculo}")
def obtener_predicciones_vehiculo(id_vehiculo: str):
    """Obtener predicciones de un vehículo específico"""
    try:
        predicciones_ref = db.collection('predicciones').where('id_vehiculo', '==', id_vehiculo).order_by('fecha_prediccion', direction='DESCENDING').limit(20)
        docs = predicciones_ref.stream()
        
        predicciones = []
        for doc in docs:
            pred = doc.to_dict()
            pred['id'] = doc.id
            if 'fecha_prediccion' in pred:
                pred['fecha_prediccion'] = pred['fecha_prediccion'].isoformat()
            predicciones.append(pred)
        
        return {"status": "success", "data": predicciones}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ALERTAS ---
@app.get("/api/alertas")
def listar_alertas(estado: str = None):
    """Obtener alertas, opcionalmente filtradas por estado"""
    try:
        alertas_ref = db.collection('alertas')
        
        if estado:
            alertas_ref = alertas_ref.where('estado', '==', estado)
        
        alertas_ref = alertas_ref.order_by('fecha_creacion', direction='DESCENDING').limit(50)
        docs = alertas_ref.stream()
        
        alertas = []
        for doc in docs:
            alerta = doc.to_dict()
            alerta['id'] = doc.id
            
            # Convertir fechas
            if 'fecha_creacion' in alerta:
                alerta['fecha_creacion'] = alerta['fecha_creacion'].isoformat()
            if 'fecha_limite' in alerta:
                alerta['fecha_limite'] = alerta['fecha_limite'].isoformat()
            if 'fecha_resolucion' in alerta:
                alerta['fecha_resolucion'] = alerta['fecha_resolucion'].isoformat()
            
            alertas.append(alerta)
        
        return {"status": "success", "data": alertas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/alertas/{id_alerta}")
def actualizar_alerta(id_alerta: str, estado: str = None, notas: str = None):
    """Marcar una alerta como resuelta"""
    try:
        doc_ref = db.collection('alertas').document(id_alerta)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Alerta no encontrada")
        
        update_data = {}
        if estado:
            update_data['estado'] = estado
        if estado == 'Resuelta':
            update_data['fecha_resolucion'] = datetime.now()
            update_data['requiere_accion'] = False
        if notas:
            update_data['notas_resolucion'] = notas
        
        if update_data:
            doc_ref.update(update_data)
        
        return {"status": "success", "mensaje": f"Alerta {id_alerta} actualizada"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- KPIS ---
@app.get("/api/kpis")
def obtener_kpis():
    """Obtener métricas y KPIs del sistema"""
    try:
        # 1. Total vehículos activos
        vehiculos_ref = db.collection('vehiculos')
        total_vehiculos = len(list(vehiculos_ref.stream()))
        
        vehiculos_activos = len(list(vehiculos_ref.where('estado', 'in', ['En ruta', 'Disponible']).stream()))
        
        # 2. Incidentes últimos 7 días
        fecha_limite = datetime.now() - timedelta(days=7)
        incidentes_ref = db.collection('incidentes_flota').where('fecha_hora', '>=', fecha_limite)
        incidentes_recientes = len(list(incidentes_ref.stream()))
        
        # 3. Alertas pendientes
        alertas_ref = db.collection('alertas').where('estado', '==', 'Pendiente')
        alertas_pendientes = len(list(alertas_ref.stream()))
        
        # 4. Promedio consumo real vs estimado (últimos 10 viajes)
        viajes_ref = db.collection('historial_viajes').order_by('fecha_viaje', direction='DESCENDING').limit(10)
        viajes = list(viajes_ref.stream())
        
        if viajes:
            total_consumo_real = 0
            total_distancia = 0
            for viaje_doc in viajes:
                viaje = viaje_doc.to_dict()
                total_consumo_real += viaje.get('combustible_total_consumido_L', 0)
                total_distancia += viaje.get('distancia_recorrida_km', 0)
            
            consumo_promedio_real = total_consumo_real / len(viajes) if len(viajes) > 0 else 0
            consumo_promedio_estimado = (total_distancia * 0.35) / len(viajes) if len(viajes) > 0 else 0
            eficiencia_operativa = (consumo_promedio_estimado / consumo_promedio_real * 100) if consumo_promedio_real > 0 else 100
        else:
            consumo_promedio_real = 0
            consumo_promedio_estimado = 0
            eficiencia_operativa = 100
        
        # 5. Vehículos con peligro de falla
        telemetria_ref = db.collection('telemetria_flota')
        telemetria_docs = telemetria_ref.stream()
        
        vehiculos_peligro = 0
        vehiculos_anomalia = 0
        
        for doc in telemetria_docs:
            datos = doc.to_dict()
            # Detectar peligro mecánico
            if datos.get('temperatura_motor', 0) >= 102 or datos.get('horas_conduccion', 0) >= 10:
                vehiculos_peligro += 1
            # Detectar anomalía de combustible
            if datos.get('consumo_instante', 0) > 0.5:
                vehiculos_anomalia += 1
        
        kpis = {
            "total_vehiculos": total_vehiculos,
            "vehiculos_activos": vehiculos_activos,
            "vehiculos_peligro": vehiculos_peligro,
            "vehiculos_anomalia": vehiculos_anomalia,
            "incidentes_7_dias": incidentes_recientes,
            "alertas_pendientes": alertas_pendientes,
            "consumo_promedio_real_L": round(consumo_promedio_real, 2),
            "consumo_promedio_estimado_L": round(consumo_promedio_estimado, 2),
            "eficiencia_operativa_pct": round(eficiencia_operativa, 2),
            "fecha_calculo": datetime.now().isoformat()
        }
        
        return {"status": "success", "data": kpis}
    except Exception as e:
        print(f"Error calculando KPIs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# CRUD VIAJES
# ============================================================================

@app.post("/api/viajes/iniciar")
def iniciar_viaje(viaje: ViajeIniciar):
    try:
        # 1. Verificamos que el vehículo esté disponible
        vehiculo_ref = db.collection('vehiculos').document(viaje.id_vehiculo)
        vehiculo_doc = vehiculo_ref.get()
        
        if vehiculo_doc.exists:
            estado_actual = vehiculo_doc.to_dict().get("estado", "")
            if estado_actual == "En ruta":
                raise HTTPException(status_code=400, detail="El camión ya se encuentra en ruta. Debe finalizar su viaje actual primero.")

        # 2. Calculamos la ruta física usando OSRM
        puntos_ruta, dist_km = routing_engine.obtener_ruta_optima(
            viaje.origen_lat, viaje.origen_lng,
            viaje.destino_lat, viaje.destino_lng
        )
        
        # =========================================================
        # ¡NUEVO SEGURO! Evitar "viajes fantasma" de 0 km
        # =========================================================
        if dist_km < 0.05:  # Si está a menos de 50 metros
            raise HTTPException(status_code=400, detail="El camión ya se encuentra en este destino. Debes asignarle una nueva ruta.")
        
        # Convertimos a formato Firebase
        puntos_firebase = [{"lat": p[0], "lng": p[1]} for p in puntos_ruta] if puntos_ruta else []

        # Calcular ruta de reposición detallada si existe
        puntos_reposicion = []
        dist_reposicion_km = 0.0
        if viaje.reposicion_origen_lat and viaje.reposicion_origen_lng:
            puntos_rep, dist_rep = routing_engine.obtener_ruta_optima(
                viaje.reposicion_origen_lat, viaje.reposicion_origen_lng,
                viaje.origen_lat, viaje.origen_lng
            )
            if dist_rep > 0.05:
                puntos_reposicion = [{"lat": p[0], "lng": p[1]} for p in puntos_rep]
                dist_reposicion_km = dist_rep

        # 3. Actualizamos la telemetría para que el Simulador y el Mapa reaccionen
        tele_ref = db.collection('telemetria_flota').document(viaje.id_vehiculo)
        # En main.py (Endpoint /api/viajes/iniciar)
        update_data = {
            "viaje_activo": True,
            "km_inicio_viaje": viaje.km_inicio,
            "origen_viaje": {"nombre": viaje.origen_nombre, "lat": viaje.origen_lat, "lng": viaje.origen_lng},
            "destino_viaje": {"nombre": viaje.destino_nombre, "lat": viaje.destino_lat, "lng": viaje.destino_lng},
            "destino": {"nombre": viaje.origen_nombre, "lat": viaje.origen_lat, "lng": viaje.origen_lng} if puntos_reposicion else {"nombre": viaje.destino_nombre, "lat": viaje.destino_lat, "lng": viaje.destino_lng},
            "fecha_inicio_viaje": datetime.now(),
            "tipo_viaje": "manual",
            "mision": "Yendo a punto de carga" if puntos_reposicion else f"Viaje asignado a {viaje.destino_nombre}",
            "fase_viaje": "reposicion" if puntos_reposicion else "principal",
            "puntos_reposicion": puntos_reposicion,
            "puntos_ruta": puntos_firebase, 
            "distancia_restante_km": dist_reposicion_km if puntos_reposicion else dist_km,
            "nueva_orden": True # <--- LA BANDERA QUE OBLIGARÁ AL SIMULADOR A OBEDECER
        }

        if viaje.ubicacion_inicial_lat and viaje.ubicacion_inicial_lng:
            update_data["ubicacion_inicial"] = {
                "nombre": viaje.ubicacion_inicial_nombre or "Posicion inicial",
                "lat": viaje.ubicacion_inicial_lat,
                "lng": viaje.ubicacion_inicial_lng
            }
            tele_existente = tele_ref.get()
            if not tele_existente.exists or not tele_existente.to_dict().get('ubicacion'):
                update_data["ubicacion"] = {
                    "lat": viaje.ubicacion_inicial_lat,
                    "lng": viaje.ubicacion_inicial_lng
                }

        tele_ref.set(update_data, merge=True)

        # 4. Guardar desplazamiento (reposicion) si existe distancia previa
        if viaje.reposicion_origen_lat and viaje.reposicion_origen_lng and viaje.reposicion_distancia_km and viaje.reposicion_distancia_km > 0:
            desplazamiento_doc = {
                "id_vehiculo": viaje.id_vehiculo,
                "tipo": "reposicion",
                "origen_nombre": viaje.reposicion_origen_nombre or "Ubicacion previa",
                "origen_lat": viaje.reposicion_origen_lat,
                "origen_lng": viaje.reposicion_origen_lng,
                "destino_nombre": viaje.origen_nombre,
                "destino_lat": viaje.origen_lat,
                "destino_lng": viaje.origen_lng,
                "distancia_km": viaje.reposicion_distancia_km,
                "combustible_estimado_L": round(viaje.reposicion_distancia_km * 0.35, 2),
                "fecha": datetime.now(),
                "id_viaje_principal": None
            }
            desp_ref = db.collection('desplazamientos').add(desplazamiento_doc)
            desplazamiento_doc['id_viaje_principal'] = desp_ref[1].id
            db.collection('desplazamientos').document(desp_ref[1].id).update({"id_viaje_principal": desp_ref[1].id})

        # 5. Cambiamos el estado del vehículo en la BD general
        if vehiculo_doc.exists:
            vehiculo_ref.update({"estado": "En ruta", "kilometraje_actual": viaje.km_inicio})

        return {"status": "success", "mensaje": f"Viaje trazado y asignado para {viaje.id_vehiculo}"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/viajes/finalizar")
def finalizar_viaje(viaje: ViajeFinalizar):
    try:
        tele_ref = db.collection('telemetria_flota').document(viaje.id_vehiculo)
        tele_doc = tele_ref.get()
        if not tele_doc.exists:
            raise HTTPException(status_code=404, detail="No hay telemetria para este vehiculo")

        tele_data = tele_doc.to_dict()
        if not tele_data.get('viaje_activo'):
            raise HTTPException(status_code=400, detail="No hay viaje activo para este vehiculo")

        km_inicio = tele_data.get('km_inicio_viaje', 0)
        km_recorridos = viaje.km_fin - km_inicio
        origen = tele_data.get('origen_viaje', {})
        destino = tele_data.get('destino_viaje', {})

        km_osrm = 0.0
        try:
            _, dist = routing_engine.obtener_ruta_optima(
                origen.get('lat', 0), origen.get('lng', 0),
                destino.get('lat', 0), destino.get('lng', 0)
            )
            km_osrm = round(dist, 2)
        except:
            pass

        desviacion = round(km_recorridos - km_osrm, 2)

        viaje_doc = {
            "id_vehiculo": viaje.id_vehiculo,
            "conductor": tele_data.get('conductor_asignado', {}).get('nombre', ''),
            "id_conductor": tele_data.get('conductor_asignado', {}).get('id_conductor', ''),
            "origen_viaje": origen,
            "destino_viaje": destino,
            "destino_nombre": destino.get('nombre', ''),
            "km_inicio": km_inicio,
            "km_fin": viaje.km_fin,
            "km_recorridos": round(km_recorridos, 2),
            "km_osrm": km_osrm,
            "desviacion_km": desviacion,
            "distancia_recorrida_km": round(km_recorridos, 2),
            "combustible_total_consumido_L": 0,
            "fecha_inicio_viaje": tele_data.get('fecha_inicio_viaje', datetime.now()),
            "fecha_fin_viaje": datetime.now(),
            "fecha_viaje": datetime.now(),
            "tipo_viaje": tele_data.get('tipo_viaje', 'manual')
        }
        db.collection('historial_viajes').add(viaje_doc)

        tele_ref.update({"viaje_activo": False})

        vehiculo_ref = db.collection('vehiculos').document(viaje.id_vehiculo)
        if vehiculo_ref.get().exists:
            vehiculo_ref.update({"kilometraje_actual": viaje.km_fin, "estado": "Disponible"})

        return {
            "status": "success",
            "mensaje": f"Viaje finalizado. Km recorridos: {round(km_recorridos, 2)}",
            "data": viaje_doc
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/viajes")
def listar_viajes(id_vehiculo: str = None):
    try:
        viajes_ref = db.collection('historial_viajes')
        if id_vehiculo:
            viajes_ref = viajes_ref.where('id_vehiculo', '==', id_vehiculo)
        viajes_ref = viajes_ref.order_by('fecha_viaje', direction='DESCENDING').limit(100)
        docs = viajes_ref.stream()

        viajes = []
        for doc in docs:
            viaje = doc.to_dict()
            viaje['id'] = doc.id
            if 'fecha_viaje' in viaje:
                viaje['fecha_viaje'] = viaje['fecha_viaje'].isoformat()
            if 'fecha_inicio_viaje' in viaje:
                viaje['fecha_inicio_viaje'] = viaje['fecha_inicio_viaje'].isoformat()
            if 'fecha_fin_viaje' in viaje:
                viaje['fecha_fin_viaje'] = viaje['fecha_fin_viaje'].isoformat()
            viajes.append(viaje)

        return {"status": "success", "data": viajes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/desplazamientos")
def listar_desplazamientos(id_vehiculo: str = None):
    try:
        desp_ref = db.collection('desplazamientos')
        if id_vehiculo:
            desp_ref = desp_ref.where('id_vehiculo', '==', id_vehiculo)
        desp_ref = desp_ref.order_by('fecha', direction='DESCENDING').limit(100)
        docs = desp_ref.stream()

        desplazamientos = []
        for doc in docs:
            desp = doc.to_dict()
            desp['id'] = doc.id
            if 'fecha' in desp:
                desp['fecha'] = desp['fecha'].isoformat()
            desplazamientos.append(desp)

        return {"status": "success", "data": desplazamientos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# ALERTAS DE MANTENIMIENTO PREVENTIVO
# ============================================================================

UMBRAL_MANTENIMIENTO_PCT = 0.85

@app.get("/api/mantenimiento-alertas")
def listar_alertas_mantenimiento(id_vehiculo: str = None):
    try:
        vehiculos_ref = db.collection('vehiculos')
        if id_vehiculo:
            vehiculos_docs = [vehiculos_ref.document(id_vehiculo).get()]
        else:
            vehiculos_docs = vehiculos_ref.stream()

        alertas = []
        for doc in vehiculos_docs:
            if not doc.exists:
                continue
            vehiculo = doc.to_dict()
            vid = vehiculo.get('id_vehiculo', doc.id)
            kilometraje = vehiculo.get('kilometraje_actual', 0)

            comp_ref = db.collection('vehiculos').document(doc.id).collection('componentes')
            comp_docs = comp_ref.stream()

            for comp_doc in comp_docs:
                nombre_comp = comp_doc.id
                datos = comp_doc.to_dict()
                if not isinstance(datos, dict):
                    continue
                km_acum = datos.get('kilometraje_acumulado', 0)
                tiempo_vida = datos.get('tiempo_vida', 0)

                if tiempo_vida <= 0:
                    continue

                pct = km_acum / tiempo_vida if tiempo_vida > 0 else 0

                if pct >= UMBRAL_MANTENIMIENTO_PCT:
                    tipo_alerta = 'cambio_pieza' if pct >= 1.0 else 'mantenimiento_preventivo'
                    gravedad = 'critico' if pct >= 1.0 else 'advertencia'

                    alertas.append({
                        "id_vehiculo": vid,
                        "componente": nombre_comp,
                        "kilometraje_acumulado": km_acum,
                        "tiempo_vida_km": tiempo_vida,
                        "porcentaje_desgaste": round(pct * 100, 1),
                        "tipo_alerta": tipo_alerta,
                        "gravedad": gravedad,
                        "mensaje": f"{nombre_comp.capitalize()} de {vid} al {round(pct*100,1)}% de desgaste ({km_acum}/{tiempo_vida} km). {'Se requiere cambio inmediato.' if pct >= 1.0 else 'Proximo a requerir mantenimiento.'}",
                        "conductor_asignado": vehiculo.get('conductor_asignado', '')
                    })

        alertas.sort(key=lambda x: x['porcentaje_desgaste'], reverse=True)
        return {"status": "success", "data": alertas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# CRUD USUARIOS
# ============================================================================

@app.get("/api/usuarios")
def listar_usuarios():
    try:
        usuarios_ref = db.collection('usuarios')
        docs = usuarios_ref.stream()
        usuarios = []
        for doc in docs:
            u = doc.to_dict()
            u['id'] = doc.id
            usuarios.append(u)
        return {"status": "success", "data": usuarios}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/usuarios/register")
def registrar_usuario(usuario: UsuarioCreate):
    try:
        email_ref = db.collection('usuarios').where('email', '==', usuario.email).stream()
        if any(True for _ in email_ref):
            raise HTTPException(status_code=400, detail="El email ya esta registrado")

        uid = f"user_{usuario.email.split('@')[0]}"
        user_data = usuario.model_dump()
        db.collection('usuarios').document(uid).set(user_data)

        if usuario.rol == "CONDUCTOR":
            if usuario.id_conductor:
                id_conductor = usuario.id_conductor
                cond_ref = db.collection('conductores').document(id_conductor)
                if not cond_ref.get().exists:
                    raise HTTPException(status_code=400, detail=f"El conductor {id_conductor} no existe")
                user_data['id_conductor'] = id_conductor
            else:
                id_conductor = f"C-{uid}"
                user_data['id_conductor'] = id_conductor
                conductor_data = {
                    "id_conductor": id_conductor,
                    "nombre": usuario.nombre,
                    "licencia": "",
                    "telefono": usuario.telefono or "",
                    "email": usuario.email,
                    "experiencia_anios": 0,
                    "calificacion": 5.0,
                    "estado": "Disponible"
                }
                db.collection('conductores').document(id_conductor).set(conductor_data)

        return {
            "status": "success",
            "mensaje": f"Usuario {usuario.nombre} registrado exitosamente",
            "data": {"id": uid, **user_data}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/usuarios/login")
def login_usuario(credenciales: UsuarioLogin):
    try:
        email_ref = db.collection('usuarios').where('email', '==', credenciales.email).stream()
        docs = list(email_ref)
        if not docs:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        user = docs[0].to_dict()
        user['id'] = docs[0].id

        if user.get('password') != credenciales.password:
            raise HTTPException(status_code=401, detail="Contrasena incorrecta")

        vehiculo_asignado = None
        if user.get('rol') == 'CONDUCTOR':
            id_conductor = user.get('id_conductor') or f"C-{user['id']}"
            vehiculos = db.collection('vehiculos').where('conductor_asignado', '==', id_conductor).stream()
            for vdoc in vehiculos:
                vehiculo_asignado = vdoc.to_dict().get('id_vehiculo', vdoc.id)
                break
            user['ref'] = vehiculo_asignado

        return {"status": "success", "data": user}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/usuarios/{id_usuario}")
def actualizar_usuario(id_usuario: str, usuario: UsuarioUpdate):
    try:
        doc_ref = db.collection('usuarios').document(id_usuario)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        update_data = {k: v for k, v in usuario.model_dump().items() if v is not None}
        doc_ref.update(update_data)
        return {"status": "success", "mensaje": f"Usuario {id_usuario} actualizado"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/usuarios/{id_usuario}")
def eliminar_usuario(id_usuario: str):
    try:
        doc_ref = db.collection('usuarios').document(id_usuario)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        doc_ref.delete()
        return {"status": "success", "mensaje": f"Usuario {id_usuario} eliminado"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
