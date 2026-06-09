import time
import random
import requests
from datetime import datetime
from database import db_manager

db = db_manager.get_db()

OSRM_URL = "http://router.project-osrm.org/route/v1/driving/"

# --- PARÁMETROS ESTÁNDAR DE CARGA PESADA ---
VELOCIDAD_CRUCERO_KMH = 45
CONSUMO_PROMEDIO_L_KM = 0.35
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

# --- CAMIONES ESTÁTICOS (SIEMPRE EN SIMULADOR) ---
CAMIONES_BASE = [
    {"id": "CAMION-001", "id_conductor": "C-001", "lat": -8.1159, "lng": -79.0299, "km": 85000.0, "combustible": 750.0, "capacidad_tanque_L": 800.0, "edad": 24, "destino": DESTINOS[0], "ruta_puntos": [], "indice_ruta": 0, "finalizado": False, "distancia_total_ruta": 0, "incidentes_conteo": 0, "es_estatico": True},
    {"id": "CAMION-002", "id_conductor": "C-002", "lat": -8.1020, "lng": -79.0260, "km": 210500.0, "combustible": 300.0, "capacidad_tanque_L": 600.0, "edad": 72, "destino": DESTINOS[3], "ruta_puntos": [], "indice_ruta": 0, "finalizado": False, "distancia_total_ruta": 0, "incidentes_conteo": 0, "es_estatico": True},
    {"id": "CAMION-003", "id_conductor": "C-003", "lat": -8.1259, "lng": -79.0399, "km": 45300.0, "combustible": 100.0, "capacidad_tanque_L": 500.0, "edad": 12, "destino": DESTINOS[1], "ruta_puntos": [], "indice_ruta": 0, "finalizado": False, "distancia_total_ruta": 0, "incidentes_conteo": 0, "es_estatico": True},
    {"id": "CAMION-004", "id_conductor": "C-004", "lat": -8.0959, "lng": -79.0099, "km": 98200.0, "combustible": 500.0, "capacidad_tanque_L": 800.0, "edad": 36, "destino": DESTINOS[2], "ruta_puntos": [], "indice_ruta": 0, "finalizado": False, "distancia_total_ruta": 0, "incidentes_conteo": 0, "es_estatico": True},
    {"id": "CAMION-005", "id_conductor": "C-005", "lat": -8.1100, "lng": -79.0400, "km": 15000.0, "combustible": 400.0, "capacidad_tanque_L": 400.0, "edad": 6, "destino": DESTINOS[4], "ruta_puntos": [], "indice_ruta": 0, "finalizado": False, "distancia_total_ruta": 0, "incidentes_conteo": 0, "es_estatico": True},
]

IDS_ESTATICOS = {"CAMION-001", "CAMION-002", "CAMION-003", "CAMION-004", "CAMION-005"}


def obtener_ruta_detallada(camion_id, start_lat, start_lng, end_lat, end_lng):
    print(f"🌐 OSRM: {camion_id} consultando ruta ({start_lat:.4f},{start_lng:.4f}) → ({end_lat:.4f},{end_lng:.4f})...")
    try:
        coords = f"{start_lng},{start_lat};{end_lng},{end_lat}"
        response = requests.get(f"{OSRM_URL}{coords}?overview=full&geometries=geojson", timeout=10)
        data = response.json()
        if data['code'] == 'Ok':
            distancia_km = data['routes'][0]['distance'] / 1000
            puntos = data['routes'][0]['geometry']['coordinates']
            print(f"✅ OSRM: {camion_id} → {round(distancia_km,2)}km, {len(puntos)} puntos")
            return puntos, distancia_km
        else:
            print(f"⚠️ OSRM: {camion_id} code={data.get('code')}, msg={data.get('message','?')}")
    except Exception as e:
        print(f"❌ OSRM ERROR [{camion_id}]: {type(e).__name__}: {e}")
    return [], 0


def obtener_conductor_nombre(id_conductor):
    if id_conductor in CONDUCTORES:
        return CONDUCTORES[id_conductor]["nombre"]
    try:
        doc = db.collection('conductores').document(id_conductor).get()
        if doc.exists:
            return doc.to_dict().get('nombre', id_conductor)
    except:
        pass
    return id_conductor


def registrar_incidente(camion_id, conductor_id, tipo, descripcion, lat, lng):
    incidente = {
        "fecha_hora": datetime.now(),
        "id_camion": camion_id,
        "conductor": obtener_conductor_nombre(conductor_id),
        "tipo_alerta": tipo,
        "descripcion": descripcion,
        "ubicacion_incidente": {"lat": lat, "lng": lng},
        "estado": "Abierto"
    }
    db.collection(u'incidentes_flota').add(incidente)


def registrar_viaje_finalizado(camion):
    if "stats" not in camion:
        print(f"⚠️ {camion['id']} llegó sin estadísticas previas. Saltando registro.")
        return

    duracion = datetime.now() - camion["stats"]["hora_inicio"]
    combustible_final = camion["stats"]["combustible_inicial"] - camion["combustible"]
    km_inicio = camion.get("km_inicio_viaje", 0)
    km_fin = camion["km"]
    km_recorridos = km_fin - km_inicio

    viaje_doc = {
        "id_vehiculo": camion["id"],
        "id_conductor": camion["id_conductor"],
        "conductor": obtener_conductor_nombre(camion["id_conductor"]),
        "origen_viaje": {"nombre": "Base Central", "lat": camion["stats"]["lat_inicial"], "lng": camion["stats"]["lng_inicial"]},
        "destino_viaje": camion["destino"],
        "destino_nombre": camion["destino"]["nombre"],
        "km_inicio": round(km_inicio, 2),
        "km_fin": round(km_fin, 2),
        "km_recorridos": round(km_recorridos, 2),
        "km_osrm": round(camion["distancia_total_ruta"], 2),
        "distancia_recorrida_km": round(km_recorridos, 2),
        "combustible_total_consumido_L": round(combustible_final, 2),
        "desviacion_km": round(km_recorridos - camion["distancia_total_ruta"], 2),
        "duracion_total": str(duracion).split('.')[0],
        "incidentes_registrados": camion["incidentes_conteo"],
        "tipo_viaje": "simulador",
        "fecha_inicio_viaje": camion["stats"]["hora_inicio"],
        "fecha_fin_viaje": datetime.now(),
        "fecha_viaje": datetime.now()
    }
    db.collection(u'historial_viajes').add(viaje_doc)
    print(f"🏁 VIAJE FINALIZADO: {camion['id']} a {camion['destino']['nombre']} | Km: {round(km_inicio, 1)} → {round(km_fin, 1)} (+{round(km_recorridos, 1)})")


def actualizar_combustible_virtual(combustible_actual_L, capacidad_tanque_L):
    if combustible_actual_L <= 0:
        return capacidad_tanque_L
    return combustible_actual_L


def cargar_camiones_dinamicos(camiones_actuales):
    try:
        docs = db.collection('vehiculos').stream()
        for doc in docs:
            v = doc.to_dict()
            vid = v.get('id_vehiculo', doc.id)
            if vid in IDS_ESTATICOS:
                continue
            if vid in camiones_actuales:
                continue

            tele_ref = db.collection('telemetria_flota').document(vid)
            tele_doc = tele_ref.get()
            if tele_doc.exists:
                tele = tele_doc.to_dict()
                km = tele.get('kilometraje', v.get('kilometraje_actual', 0))
                combustible = tele.get('combustible_actual_L', v.get('capacidad_tanque_L', 400) * 0.9)
                lat = tele.get('ubicacion', {}).get('lat', -8.1159)
                lng = tele.get('ubicacion', {}).get('lng', -79.0299)
                viaje_activo = tele.get('viaje_activo', False)
                destino_actual = tele.get('destino', random.choice(DESTINOS))
            else:
                km = v.get('kilometraje_actual', 0)
                combustible = int(v.get('capacidad_tanque_L', 400) * 0.9)
                lat = -8.1159
                lng = -79.0299
                viaje_activo = False
                destino_actual = random.choice(DESTINOS)

            nuevo = {
                "id": vid,
                "id_conductor": v.get('conductor_asignado', 'C-001'),
                "lat": lat,
                "lng": lng,
                "km": float(km),
                "combustible": float(combustible),
                "capacidad_tanque_L": float(v.get('capacidad_tanque_L', 400)),
                "edad": int(v.get('edad_motor_meses', 0)),
                "destino": destino_actual,
                "ruta_puntos": [],
                "indice_ruta": 0,
                "finalizado": not viaje_activo,
                "distancia_total_ruta": 0,
                "incidentes_conteo": 0,
                "es_estatico": False
            }
            camiones_actuales[vid] = nuevo

            if not tele_doc.exists:
                tele_ref.set({
                    "id_camion": vid,
                    "conductor_asignado": {"nombre": obtener_conductor_nombre(v.get('conductor_asignado', '')), "id_conductor": v.get('conductor_asignado', '')},
                    "ubicacion": {"lat": lat, "lng": lng},
                    "kilometraje": float(km),
                    "combustible_actual_L": float(combustible),
                    "capacidad_tanque_L": float(v.get('capacidad_tanque_L', 400)),
                    "nivel_combustible_pct": round((combustible / float(v.get('capacidad_tanque_L', 400))) * 100, 2) if float(v.get('capacidad_tanque_L', 400)) > 0 else 0,
                    "estado_motor": "Optimo",
                    "edad_motor_meses": int(v.get('edad_motor_meses', 0)),
                    "horas_conduccion": 0,
                    "temperatura_motor": 0,
                    "consumo_instante": 0,
                    "destino": destino_actual,
                    "mision": "Esperando orden",
                    "distancia_restante_km": 0,
                    "ultima_actualizacion": datetime.now(),
                    "viaje_activo": False,
                    "km_inicio_viaje": float(km),
                    "puntos_ruta": []
                })
                print(f"🆕 {vid}: nuevo vehículo del CRUD inicializado en telemetria")
            else:
                print(f"🔄 {vid}: vehículo dinámico cargado desde Firestore (km={round(km, 1)})")

        ids_actuales = set(camiones_actuales.keys())
        for vid in list(ids_actuales):
            if vid not in IDS_ESTATICOS:
                vdoc = db.collection('vehiculos').document(vid).get()
                if not vdoc.exists:
                    print(f"🗑️ {vid}: vehículo eliminado del CRUD, removiendo de simulación")
                    del camiones_actuales[vid]

    except Exception as e:
        print(f"⚠️ Error cargando camiones dinámicos: {e}")


def actualizar_componentes_kilometraje(vid, distancia_km):
    try:
        comp_ref = db.collection('vehiculos').document(vid).collection('componentes')
        comp_docs = comp_ref.stream()
        for comp_doc in comp_docs:
            comp_data = comp_doc.to_dict()
            if isinstance(comp_data, dict):
                nuevo_km = round(comp_data.get('kilometraje_acumulado', 0) + distancia_km, 2)
                comp_ref.document(comp_doc.id).update({'kilometraje_acumulado': nuevo_km})
    except Exception as e:
        pass


def actualizar_flota():
    print("🚀 FleetMind AI: Iniciando motor de física y trazabilidad real...")

    camiones_dinamicos = {}
    contador_sincronizacion = 0

    tick = 0
    while True:
        tick += 1

        contador_sincronizacion += 1
        if contador_sincronizacion >= 6:
            cargar_camiones_dinamicos(camiones_dinamicos)
            contador_sincronizacion = 0

        camiones_en_ruta = 0
        todos = CAMIONES_BASE + list(camiones_dinamicos.values())

        for camion in todos:
            vid = camion["id"]
            es_estatico = camion.get("es_estatico", False)

            # =================================================================
            # SINCRONIZACIÓN CON TELEMETRÍA FIREBASE
            # =================================================================
            try:
                doc_ia = db.collection(u'telemetria_flota').document(vid).get()
                if doc_ia.exists:
                    datos_ia = doc_ia.to_dict()

                    if datos_ia.get("viaje_activo") == False:
                        if not camion.get("finalizado"):
                            print(f"🛑 {vid}: Viaje detenido desde la App.")
                            camion["finalizado"] = True
                        continue

                    if datos_ia.get("nueva_orden") == True:
                        print(f"🤖 ¡Orden Externa Detectada! Enrutando {vid}")
                        camion["finalizado"] = False
                        camion["destino"] = datos_ia.get("destino", camion["destino"])

                        fase = datos_ia.get("fase_viaje", "principal")
                        camion["fase_viaje"] = fase

                        if fase == "reposicion" and "puntos_reposicion" in datos_ia and len(datos_ia["puntos_reposicion"]) > 0:
                            # Cargar la ruta de reposición física A -> B
                            nueva_ruta = []
                            for p in datos_ia["puntos_reposicion"]:
                                lat = p["lat"] if isinstance(p, dict) else p[0]
                                lng = p["lng"] if isinstance(p, dict) else p[1]
                                nueva_ruta.append([lng, lat])
                            camion["ruta_puntos"] = nueva_ruta
                            camion["distancia_total_ruta"] = datos_ia.get("distancia_restante_km", 0.1)
                            print(f"📍 {vid}: Enrutado en REPOSICION. Distancia: {round(camion['distancia_total_ruta'], 2)} km")
                        else:
                            # Cargar ruta principal B -> C
                            if "puntos_ruta" in datos_ia and len(datos_ia["puntos_ruta"]) > 0:
                                nueva_ruta = []
                                for p in datos_ia["puntos_ruta"]:
                                    lat = p["lat"] if isinstance(p, dict) else p[0]
                                    lng = p["lng"] if isinstance(p, dict) else p[1]
                                    nueva_ruta.append([lng, lat])
                                camion["ruta_puntos"] = nueva_ruta
                            else:
                                pts, _ = obtener_ruta_detallada(vid, camion["lat"], camion["lng"], camion["destino"]["lat"], camion["destino"]["lng"])
                                camion["ruta_puntos"] = pts
                            camion["distancia_total_ruta"] = datos_ia.get("distancia_restante_km", 0.1)
                            print(f"📍 {vid}: Enrutado en RUTA PRINCIPAL. Distancia: {round(camion['distancia_total_ruta'], 2)} km")

                        camion["indice_ruta"] = 0
                        camion["km_inicio_viaje"] = camion["km"]
                        db.collection(u'telemetria_flota').document(vid).update({"nueva_orden": False})

                    elif camion.get("finalizado"):
                        print(f"▶️ {vid}: Reanudando viaje hacia {camion['destino']['nombre']}.")
                        camion["finalizado"] = False
                        pts, dist = obtener_ruta_detallada(vid, camion["lat"], camion["lng"], camion["destino"]["lat"], camion["destino"]["lng"])
                        camion["ruta_puntos"] = pts
                        camion["distancia_total_ruta"] = max(dist, 0.1)
                        camion["indice_ruta"] = 0

            except Exception as e:
                pass

            if camion.get("finalizado"):
                continue

            camiones_en_ruta += 1

            # --- 1. INICIO DE RUTA NORMAL ---
            if not camion["ruta_puntos"]:
                puntos, dist_total = obtener_ruta_detallada(vid, camion["lat"], camion["lng"], camion["destino"]["lat"], camion["destino"]["lng"])
                if dist_total == 0:
                    dist_total = 0.1
                camion["ruta_puntos"] = puntos
                camion["distancia_total_ruta"] = dist_total
                camion["km_inicio_viaje"] = camion["km"]
                camion["stats"] = {
                    "hora_inicio": datetime.now(),
                    "combustible_inicial": camion["combustible"],
                    "lat_inicial": camion["lat"],
                    "lng_inicial": camion["lng"]
                }
                print(f"📍 {vid}: iniciando ruta OSRM de {round(dist_total, 2)}km ({len(puntos)} pts)")

            # --- 2. CÁLCULO DE MOVIMIENTO ---
            distancia_paso = (VELOCIDAD_CRUCERO_KMH / 3600) * INTERVALO_SIMULACION_SEG

            if camion["indice_ruta"] < len(camion["ruta_puntos"]):
                salto = int((len(camion["ruta_puntos"]) / max(0.1, camion["distancia_total_ruta"])) * distancia_paso)
                camion["indice_ruta"] += max(1, salto)

                if camion["indice_ruta"] < len(camion["ruta_puntos"]):
                    punto = camion["ruta_puntos"][camion["indice_ruta"]]
                    camion["lng"], camion["lat"] = punto[0], punto[1]
                    camion["km"] += distancia_paso

                    # ACTUALIZAR COMPONENTES: sumar kilometraje a cada pieza
                    actualizar_componentes_kilometraje(vid, distancia_paso)

                    print(f"🚛 {vid}: indic={camion['indice_ruta']}/{len(camion['ruta_puntos'])} km={camion['km']:.1f} pos=({camion['lat']:.4f},{camion['lng']:.4f})")
            else:
                # Comprobar si hemos terminado la fase de reposición
                if camion.get("fase_viaje") == "reposicion":
                    print(f"🏁 {vid}: Llegó al punto de carga. Iniciando viaje principal...")
                    try:
                        doc = db.collection(u'telemetria_flota').document(vid).get()
                        if doc.exists:
                            datos_tele = doc.to_dict()
                            pts_principal = datos_tele.get("puntos_ruta", [])
                            destino_final = datos_tele.get("destino_viaje", camion["destino"])
                            
                            camion["fase_viaje"] = "principal"
                            camion["destino"] = destino_final
                            camion["indice_ruta"] = 0
                            
                            nueva_ruta = []
                            for p in pts_principal:
                                lat = p["lat"] if isinstance(p, dict) else p[0]
                                lng = p["lng"] if isinstance(p, dict) else p[1]
                                nueva_ruta.append([lng, lat])
                            camion["ruta_puntos"] = nueva_ruta
                            
                            # Calcular distancia física real del viaje principal
                            _, dist_princ = obtener_ruta_detallada(vid, camion["lat"], camion["lng"], destino_final["lat"], destino_final["lng"])
                            camion["distancia_total_ruta"] = max(dist_princ, 0.1)
                            camion["km_inicio_viaje"] = camion["km"]
                            
                            db.collection(u'telemetria_flota').document(vid).update({
                                "fase_viaje": "principal",
                                "mision": f"Ruta a {destino_final['nombre']}",
                                "destino": destino_final,
                                "distancia_restante_km": camion["distancia_total_ruta"],
                                "km_inicio_viaje": camion["km"]
                            })
                            continue
                    except Exception as e:
                        print(f"❌ Error al pasar a fase principal [{vid}]: {e}")

                print(f"🏁 {vid}: FINALIZADO")
                registrar_viaje_finalizado(camion)
                camion["finalizado"] = True

                try:
                    db.collection(u'telemetria_flota').document(vid).update({
                        "viaje_activo": False,
                        "mision": "Esperando orden",
                        "puntos_ruta": [],
                        "fase_viaje": "completado"
                    })
                    db.collection(u'vehiculos').document(vid).update({
                        "estado": "Disponible",
                        "kilometraje_actual": round(camion["km"], 2)
                    })
                except Exception as e:
                    print(f"Error actualizando Firebase al finalizar viaje: {e}")

                continue

            # --- 3. CONSUMO Y ANOMALÍAS ---
            factor_edad = 1.15 if camion["edad"] > 60 else 1.0
            consumo_real = distancia_paso * CONSUMO_PROMEDIO_L_KM * factor_edad
            consumo_enviado = consumo_real

            if vid == "CAMION-003" and random.random() < 0.10:
                consumo_enviado = consumo_real * 15
                camion["incidentes_conteo"] = camion.get("incidentes_conteo", 0) + 1
                registrar_incidente(vid, camion["id_conductor"], "Anomalía de Combustible", f"Consumo irregular detectado: {round(consumo_enviado, 2)}L en 10s.", camion["lat"], camion["lng"])

            camion["combustible"] -= consumo_enviado
            if camion["combustible"] <= 20:
                print(f"⛽ {vid}: tanque vacío ({round(camion['combustible'],1)}L) → rellenado a {camion['capacidad_tanque_L']}L")
                camion["combustible"] = camion["capacidad_tanque_L"]

            # --- 4. SENSORES DE MOTOR ---
            if vid == "CAMION-002":
                horas = round(random.uniform(10.0, 14.0), 1)
                temp = round(random.uniform(105.0, 115.0), 1)
            else:
                horas = round(random.uniform(1.0, 6.0), 1)
                temp = round(random.uniform(80.0, 95.0), 1)

            # --- 5. ENVÍO DE TELEMETRÍA ---
            try:
                dist_restante = max(0.0, camion["distancia_total_ruta"] - (camion["indice_ruta"] * (camion["distancia_total_ruta"] / max(1, len(camion["ruta_puntos"])))))
                porcentaje_combustible = (camion["combustible"] / camion["capacidad_tanque_L"]) * 100

                hay_falla_mecanica = (temp >= 102 or horas >= 10)
                hay_poca_gasolina = (porcentaje_combustible <= 15)
                estado_final = "Alerta" if (hay_falla_mecanica or hay_poca_gasolina) else "Optimo"

                pts = camion["ruta_puntos"]
                paso = max(1, len(pts) // 50) if pts else 1
                puntos_ruta_firestore = [
                    {"lat": pts[i][1], "lng": pts[i][0]}
                    for i in range(0, len(pts), paso)
                ] if pts else []

                conductor_info = {"nombre": obtener_conductor_nombre(camion["id_conductor"]), "id_conductor": camion["id_conductor"]}

                db.collection(u'telemetria_flota').document(vid).set({
                    "id_camion": vid,
                    "conductor_asignado": conductor_info,
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
                    "mision": f"Ruta a {camion['destino']['nombre']}" if not camion.get("finalizado", True) else "Esperando orden",
                    "distancia_restante_km": round(dist_restante, 2),
                    "ultima_actualizacion": datetime.now(),
                    "viaje_activo": not camion.get("finalizado", False),
                    "km_inicio_viaje": camion.get("km_inicio_viaje", camion["km"]),
                    "puntos_ruta": puntos_ruta_firestore
                }, merge=True)
                print(f"📡 {vid}: telemetria enviada (ruta={len(puntos_ruta_firestore)}pts)")
            except Exception as e:
                print(f"❌ Error en Firebase [{vid}]: {e}")

        if camiones_en_ruta > 0:
            nuevo_count = len(camiones_dinamicos)
            extra = f" (+{nuevo_count} dinámicos)" if nuevo_count > 0 else ""
            print(f"✅ [TICK {tick}] [{datetime.now().strftime('%H:%M:%S')}] {camiones_en_ruta} camiones en movimiento{extra}...")
        else:
            print(f"🌟 [TICK {tick}] [{datetime.now().strftime('%H:%M:%S')}] Toda la flota ha llegado a su destino. Simulador en pausa.")

        time.sleep(INTERVALO_SIMULACION_SEG)


if __name__ == "__main__":
    actualizar_flota()
