"""Endpoints del ciclo de vida de un viaje: iniciar, finalizar y consultar."""
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion
from app.integrations.routing import routing_engine
from app.schemas.viaje import ViajeFinalizar, ViajeIniciar

router = APIRouter(tags=["Viajes"])
logger = get_logger("api.viajes")
db = get_db()

@router.post("/api/viajes/iniciar")
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

        # OSRM no pudo calcular la ruta (fallo de red, timeout, coords inválidas)
        if puntos_ruta is None:
            print(f"❌ OSRM falló para {viaje.id_vehiculo}: origen=({viaje.origen_lat},{viaje.origen_lng}) destino=({viaje.destino_lat},{viaje.destino_lng})")
            raise HTTPException(status_code=503, detail="No se pudo calcular la ruta. El servicio de mapas no está disponible en este momento. Intenta de nuevo en unos segundos.")

        # Evitar "viajes fantasma" de 0 km (origen y destino son el mismo punto)
        if dist_km < 0.05:
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

        # Leer telemetria actual: capturar combustible al inicio del viaje para medir consumo real
        tele_existente = None
        try:
            tele_existente = tele_ref.get()
            if tele_existente.exists:
                combustible_inicio = tele_existente.to_dict().get('combustible_actual_L', 0)
                if combustible_inicio > 0:
                    update_data['combustible_inicio_viaje_L'] = combustible_inicio
        except Exception as e_tele:
            print(f"[iniciar_viaje] Error al leer telemetria inicial: {e_tele}")

        if viaje.ubicacion_inicial_lat and viaje.ubicacion_inicial_lng:
            update_data["ubicacion_inicial"] = {
                "nombre": viaje.ubicacion_inicial_nombre or "Posicion inicial",
                "lat": viaje.ubicacion_inicial_lat,
                "lng": viaje.ubicacion_inicial_lng
            }
            if tele_existente is None:
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

@router.post("/api/viajes/finalizar")
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

        # Calcular consumo real del viaje usando snapshot de combustible guardado al iniciar
        combustible_inicio_viaje = tele_data.get('combustible_inicio_viaje_L', 0)
        combustible_actual = tele_data.get('combustible_actual_L', 0)
        combustible_consumido_L = round(max(0.0, combustible_inicio_viaje - combustible_actual), 2) if combustible_inicio_viaje > 0 else 0.0
        rendimiento_km_l = round(km_recorridos / combustible_consumido_L, 2) if combustible_consumido_L > 0 else 0.0

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
            "combustible_total_consumido_L": combustible_consumido_L,
            "rendimiento_km_l": rendimiento_km_l,
            "fecha_inicio_viaje": tele_data.get('fecha_inicio_viaje', datetime.now()),
            "fecha_fin_viaje": datetime.now(),
            "fecha_viaje": datetime.now(),
            "tipo_viaje": tele_data.get('tipo_viaje', 'manual')
        }
        db.collection('historial_viajes').add(viaje_doc)

        # Verificar consumo vs promedio historico de flota y generar alerta si hay exceso >= 15%
        if combustible_consumido_L > 0 and km_recorridos > 0:
            try:
                viajes_hist = db.collection('historial_viajes')\
                    .where('combustible_total_consumido_L', '>', 0)\
                    .limit(50).stream()
                consumos_hist = []
                for doc_hist in viajes_hist:
                    d_hist = doc_hist.to_dict()
                    km_h = d_hist.get('distancia_recorrida_km', 0) or d_hist.get('km_recorridos', 0)
                    comb_h = d_hist.get('combustible_total_consumido_L', 0)
                    if km_h > 0 and comb_h > 0:
                        consumos_hist.append(comb_h / km_h)

                avg_l_km = round(sum(consumos_hist) / len(consumos_hist), 4) if consumos_hist else 0.35
                consumo_esperado_L = round(km_recorridos * avg_l_km, 2)
                rendimiento_hist_km_l = round(1 / avg_l_km, 2) if avg_l_km > 0 else 0.0
                desviacion_pct = round(((combustible_consumido_L - consumo_esperado_L) / consumo_esperado_L) * 100, 1) if consumo_esperado_L > 0 else 0.0

                if desviacion_pct > 15:
                    gravedad = "alta" if desviacion_pct > 30 else "media"
                    db.collection("alertas").add({
                        "tipo_alerta": "CONSUMO_EXCESIVO",
                        "id_vehiculo": viaje.id_vehiculo,
                        "conductor": tele_data.get('conductor_asignado', {}).get('nombre', ''),
                        "mensaje": (
                            f"Consumo excesivo en {viaje.id_vehiculo}: {combustible_consumido_L}L consumidos "
                            f"(esperado {consumo_esperado_L}L, +{desviacion_pct}% sobre promedio historico). "
                            f"Rendimiento real: {rendimiento_km_l} km/L vs historico: {rendimiento_hist_km_l} km/L. "
                            f"Posible conduccion ineficiente o robo de combustible."
                        ),
                        "gravedad": gravedad,
                        "estado": "Pendiente",
                        "rendimiento_real_km_l": rendimiento_km_l,
                        "rendimiento_historico_km_l": rendimiento_hist_km_l,
                        "consumo_real_L": combustible_consumido_L,
                        "consumo_esperado_L": consumo_esperado_L,
                        "desviacion_pct": desviacion_pct,
                        "km_recorridos": round(km_recorridos, 2),
                        "requiere_atencion": True,
                        "fecha_creacion": datetime.now()
                    })
                    print(f"🚨 Alerta consumo excesivo: {viaje.id_vehiculo} +{desviacion_pct}% sobre historico ({combustible_consumido_L}L vs {consumo_esperado_L}L esperado)")
            except Exception as e_alerta:
                print(f"[finalizar_viaje] Error al evaluar consumo historico: {e_alerta}")

        tele_ref.update({
            "viaje_activo": False,
            "puntos_ruta": [],
            "puntos_reposicion": [],
            "destino": {},
            "origen_viaje": {},
            "destino_viaje": {},
            "fase_viaje": "",
            "mision": "",
            "distancia_restante_km": 0,
            "nueva_orden": False
        })
        print(f"✅ Viaje finalizado y ruta limpiada para {viaje.id_vehiculo}")

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
@router.get("/api/viajes")
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
