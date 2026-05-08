import time
import random
import requests
from datetime import datetime
from database import db_manager

db = db_manager.get_db()

OSRM_URL = "http://router.project-osrm.org/route/v1/driving/"

# --- PARÁMETROS ESTÁNDAR DE CARGA PESADA ---
VELOCIDAD_CRUCERO_KMH = 45  # Velocidad promedio urbana para camiones
CONSUMO_PROMEDIO_L_KM = 0.35 # 35 litros por cada 100km
INTERVALO_SIMULACION_SEG = 10 

CONDUCTORES = {
    "C-001": {"nombre": "Juan Pérez", "licencia": "A3B", "telefono": "987654321"},
    "C-002": {"nombre": "Carlos Mendoza", "licencia": "A3C", "telefono": "912345678"},
    "C-003": {"nombre": "Luis Ramírez", "licencia": "A3B", "telefono": "998877665"},
    "C-004": {"nombre": "Miguel Torres", "licencia": "A3C", "telefono": "955443322"},
    "C-005": {"nombre": "Jorge Vargas", "licencia": "A3B", "telefono": "911223344"}
}

DESTINOS = [
    {"nombre": "Almacén Laredo", "lat": -8.0822, "lng": -79.0144},
    {"nombre": "Plaza Mall", "lat": -8.1065, "lng": -79.0335},
    {"nombre": "Puerto Salaverry", "lat": -8.2255, "lng": -78.9811},
    {"nombre": "Taller Sur", "lat": -8.1280, "lng": -79.0350},
    {"nombre": "Centro Histórico", "lat": -8.1118, "lng": -79.0287}
]

# --- CAPACIDADES REALES DE TANQUES ---
CAMIONES = [
    {"id": "CAMION-001", "id_conductor": "C-001", "lat": -8.1159, "lng": -79.0299, "km": 85000.0, "combustible": 750.0, "capacidad_tanque_L": 800.0, "edad": 24, "destino": DESTINOS[0], "ruta_puntos": [], "indice_ruta": 0, "finalizado": False, "distancia_total_ruta": 0, "incidentes_conteo": 0},
    {"id": "CAMION-002", "id_conductor": "C-002", "lat": -8.1020, "lng": -79.0260, "km": 210500.0, "combustible": 300.0, "capacidad_tanque_L": 600.0, "edad": 72, "destino": DESTINOS[3], "ruta_puntos": [], "indice_ruta": 0, "finalizado": False, "distancia_total_ruta": 0, "incidentes_conteo": 0},
    {"id": "CAMION-003", "id_conductor": "C-003", "lat": -8.1259, "lng": -79.0399, "km": 45300.0, "combustible": 100.0, "capacidad_tanque_L": 500.0, "edad": 12, "destino": DESTINOS[1], "ruta_puntos": [], "indice_ruta": 0, "finalizado": False, "distancia_total_ruta": 0, "incidentes_conteo": 0},
    {"id": "CAMION-004", "id_conductor": "C-004", "lat": -8.0959, "lng": -79.0099, "km": 98200.0, "combustible": 500.0, "capacidad_tanque_L": 800.0, "edad": 36, "destino": DESTINOS[2], "ruta_puntos": [], "indice_ruta": 0, "finalizado": False, "distancia_total_ruta": 0, "incidentes_conteo": 0},
    {"id": "CAMION-005", "id_conductor": "C-005", "lat": -8.1100, "lng": -79.0400, "km": 15000.0, "combustible": 400.0, "capacidad_tanque_L": 400.0, "edad": 6, "destino": DESTINOS[4], "ruta_puntos": [], "indice_ruta": 0, "finalizado": False, "distancia_total_ruta": 0, "incidentes_conteo": 0},
]

def obtener_ruta_detallada(start_lat, start_lng, end_lat, end_lng):
    try:
        coords = f"{start_lng},{start_lat};{end_lng},{end_lat}"
        response = requests.get(f"{OSRM_URL}{coords}?overview=full&geometries=geojson")
        data = response.json()
        if data['code'] == 'Ok':
            distancia_km = data['routes'][0]['distance'] / 1000
            puntos = data['routes'][0]['geometry']['coordinates']
            return puntos, distancia_km
    except Exception as e:
        print(f"⚠️ Error GPS: {e}")
    return [], 0

# En simulator.py, verifica que el nombre de la colección sea exacto
def registrar_incidente(camion_id, conductor_id, tipo, descripcion, lat, lng):
    incidente = {
        "fecha_hora": datetime.now(),
        "id_camion": camion_id,
        "conductor": CONDUCTORES.get(conductor_id, "Desconocido"),
        "tipo_alerta": tipo,
        "descripcion": descripcion,
        "ubicacion_incidente": {"lat": lat, "lng": lng},
        "estado": "Abierto"
    }
    db.collection(u'incidentes_flota').add(incidente) # Verifica este nombre en Firebase

def registrar_viaje_finalizado(camion):
    if "stats" not in camion:
        print(f"⚠️ {camion['id']} llegó sin estadísticas previas. Saltando registro.")
        return

    duracion = datetime.now() - camion["stats"]["hora_inicio"]
    combustible_final = camion["stats"]["combustible_inicial"] - camion["combustible"]
    
    viaje_doc = {
        "id_camion": camion["id"],
        "conductor": CONDUCTORES[camion["id_conductor"]]["nombre"],
        "punto_partida": {"lat": camion["stats"]["lat_inicial"], "lng": camion["stats"]["lng_inicial"]},
        "punto_llegada": {"lat": camion["destino"]["lat"], "lng": camion["destino"]["lng"]},
        "destino_nombre": camion["destino"]["nombre"],
        "distancia_recorrida_km": round(camion["distancia_total_ruta"], 2),
        "combustible_total_consumido_L": round(combustible_final, 2),
        "duracion_total": str(duracion).split('.')[0],
        "incidentes_registrados": camion["incidentes_conteo"],
        "fecha_viaje": datetime.now()
    }
    db.collection(u'historial_viajes').add(viaje_doc)
    print(f"🏁 VIAJE FINALIZADO Y GUARDADO: {camion['id']} llegó a {camion['destino']['nombre']}")

def actualizar_flota():
    print("🚀 FleetMind AI: Iniciando motor de física y trazabilidad real...")
    
    while True:
        camiones_en_ruta = 0
        
        for camion in CAMIONES:
            if camion["finalizado"]: 
                continue
                
            camiones_en_ruta += 1

            # =================================================================
            # NUEVO MÓDULO: SINCRONIZACIÓN FÍSICA CON LAS ÓRDENES DE LA IA
            # =================================================================
            try:
                doc_ia = db.collection(u'telemetria_flota').document(camion["id"]).get()
                if doc_ia.exists:
                    datos_ia = doc_ia.to_dict()
                    
                    # Verificamos si la IA (Gemini) cambió el destino en la base de datos
                    if "destino" in datos_ia and datos_ia["destino"]["nombre"] != camion["destino"]["nombre"]:
                        print(f"🤖 ¡IA tomó el control! Redirigiendo {camion['id']} a {datos_ia['destino']['nombre']}")
                        
                        camion["destino"] = datos_ia["destino"]
                        
                        # Extraemos los puntos físicos de la nueva ruta (Maneja diccionarios o listas)
                        if "puntos_ruta" in datos_ia and len(datos_ia["puntos_ruta"]) > 0:
                            nueva_ruta = []
                            for p in datos_ia["puntos_ruta"]:
                                lat = p["lat"] if isinstance(p, dict) else p[0]
                                lng = p["lng"] if isinstance(p, dict) else p[1]
                                nueva_ruta.append([lat, lng])
                            camion["ruta_puntos"] = nueva_ruta
                        else:
                            # Respaldo en caso de que falten puntos
                            puntos, _ = obtener_ruta_detallada(camion["lat"], camion["lng"], camion["destino"]["lat"], camion["destino"]["lng"])
                            camion["ruta_puntos"] = puntos

                        camion["distancia_total_ruta"] = datos_ia.get("distancia_restante_km", 0.1)
                        camion["indice_ruta"] = 0 # Reiniciamos el viaje
                        camion["stats"] = {
                            "hora_inicio": datetime.now(),
                            "combustible_inicial": camion["combustible"],
                            "lat_inicial": camion["lat"],
                            "lng_inicial": camion["lng"]
                }
                        # Limpiamos la orden para que no entre en bucle de reinicio
                        db.collection(u'telemetria_flota').document(camion["id"]).update({"puntos_ruta": []})
                        
                        # Reiniciamos las métricas para no arrastrar el combustible de la misión anterior
                        if "stats" in camion:
                            camion["stats"]["lat_inicial"] = camion["lat"]
                            camion["stats"]["lng_inicial"] = camion["lng"]
                            camion["stats"]["combustible_inicial"] = camion["combustible"]
            except Exception as e:
                pass
            # =================================================================

            # --- 1. INICIO DE RUTA NORMAL ---
            if not camion["ruta_puntos"]:
                puntos, dist_total = obtener_ruta_detallada(camion["lat"], camion["lng"], camion["destino"]["lat"], camion["destino"]["lng"])
                if dist_total == 0: dist_total = 0.1 
                camion["ruta_puntos"] = puntos
                camion["distancia_total_ruta"] = dist_total
                camion["stats"] = {
                    "hora_inicio": datetime.now(),
                    "combustible_inicial": camion["combustible"],
                    "lat_inicial": camion["lat"],
                    "lng_inicial": camion["lng"]
                }
                print(f"📍 {camion['id']} iniciando ruta de {round(dist_total, 2)} km")

            # --- 2. CÁLCULO DE MOVIMIENTO REALISTA ---
            distancia_paso = (VELOCIDAD_CRUCERO_KMH / 3600) * INTERVALO_SIMULACION_SEG
            
            if camion["indice_ruta"] < len(camion["ruta_puntos"]):
                salto = int((len(camion["ruta_puntos"]) / max(0.1, camion["distancia_total_ruta"])) * distancia_paso)
                camion["indice_ruta"] += max(1, salto)
                
                if camion["indice_ruta"] < len(camion["ruta_puntos"]):
                    punto = camion["ruta_puntos"][camion["indice_ruta"]]
                    camion["lng"], camion["lat"] = punto[0], punto[1]
                    camion["km"] += distancia_paso
            else:
                registrar_viaje_finalizado(camion)
                camion["finalizado"] = True
                continue

            # --- 3. CONSUMO Y ANOMALÍAS ---
            factor_edad = 1.15 if camion["edad"] > 60 else 1.0
            consumo_real = distancia_paso * CONSUMO_PROMEDIO_L_KM * factor_edad
            consumo_enviado = consumo_real
            
            if camion["id"] == "CAMION-003" and random.random() < 0.10:
                consumo_enviado = consumo_real * 15
                camion["incidentes_conteo"] += 1
                registrar_incidente(camion["id"], camion["id_conductor"], "Anomalía de Combustible", f"Consumo irregular detectado: {round(consumo_enviado, 2)}L en 10s.", camion["lat"], camion["lng"])

            camion["combustible"] -= consumo_enviado
            if camion["combustible"] <= 20: 
                camion["combustible"] = camion["capacidad_tanque_L"]

            # --- 4. SENSORES DE MOTOR PARA LA IA ---
            if camion["id"] == "CAMION-002":
                horas = round(random.uniform(10.0, 14.0), 1)
                temp = round(random.uniform(105.0, 115.0), 1)
            else:
                horas = round(random.uniform(1.0, 6.0), 1)
                temp = round(random.uniform(80.0, 95.0), 1)

            # --- 5. ENVÍO DE TELEMETRÍA A FIREBASE ---
            try:
                dist_restante = max(0.0, camion["distancia_total_ruta"] - (camion["indice_ruta"] * (camion["distancia_total_ruta"]/max(1, len(camion["ruta_puntos"])))))
                porcentaje_combustible = (camion["combustible"] / camion["capacidad_tanque_L"]) * 100

                hay_falla_mecanica = (temp >= 102 or horas >= 10)
                hay_poca_gasolina = (porcentaje_combustible <= 15)
                estado_final = "Alerta" if (hay_falla_mecanica or hay_poca_gasolina) else "Optimo"

                # En este SET ya NO subimos puntos_ruta, así ahorramos muchísimo espacio
                # y dejamos que Angular controle su trazado por calles localmente.
                # ...
                db.collection(u'telemetria_flota').document(camion["id"]).set({
                    "id_camion": camion["id"],
                    "conductor_asignado": CONDUCTORES[camion["id_conductor"]],
                    "ubicacion": {"lat": camion["lat"], "lng": camion["lng"]},
                    "kilometraje": round(camion["km"], 2),
                    "combustible_actual_L": round(camion["combustible"], 2),
                    "capacidad_tanque_L": camion["capacidad_tanque_L"],
                    "nivel_combustible_pct": round(porcentaje_combustible, 2),
                    "estado_motor": estado_final, 
                    "edad_motor_meses": camion["edad"],
                    "horas_conduccion": horas,
                    "temperatura_motor": temp,
                    "consumo_instante": round(consumo_enviado, 2),
                    "destino": camion["destino"],
                    "mision": f"Ruta a {camion['destino']['nombre']}",
                    "distancia_restante_km": round(dist_restante, 2),
                    "ultima_actualizacion": datetime.now()
                }, merge=True) # <--- EL SECRETO ESTÁ AQUÍ. Merge evita borrar los puntos_ruta de la IA
                # ...
            except Exception as e:
                print(f"❌ Error en Firebase: {e}")

        if camiones_en_ruta > 0:
            print(f"✅ [{datetime.now().strftime('%H:%M:%S')}] {camiones_en_ruta} camiones en movimiento...")
        else:
            print(f"🌟 [{datetime.now().strftime('%H:%M:%S')}] Toda la flota ha llegado a su destino. Simulador en pausa.")
            
        time.sleep(INTERVALO_SIMULACION_SEG)

if __name__ == "__main__":
    actualizar_flota()