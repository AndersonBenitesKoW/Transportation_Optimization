"""Endpoint de rendimiento de combustible de la flota."""
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion

router = APIRouter(tags=["Rendimiento"])
logger = get_logger("api.rendimiento")
db = get_db()

@router.get("/api/rendimiento-combustible")
def get_rendimiento_combustible():
    try:
        viajes_hist = db.collection('historial_viajes')\
            .where('combustible_total_consumido_L', '>', 0)\
            .limit(100).stream()

        consumos_l_km = []
        por_vehiculo: dict = {}

        for doc_v in viajes_hist:
            d = doc_v.to_dict()
            km = d.get('distancia_recorrida_km', 0) or d.get('km_recorridos', 0)
            comb = d.get('combustible_total_consumido_L', 0)
            id_v = d.get('id_vehiculo', '')
            if km > 0 and comb > 0:
                l_km = comb / km
                consumos_l_km.append(l_km)
                if id_v not in por_vehiculo:
                    por_vehiculo[id_v] = []
                por_vehiculo[id_v].append({
                    "km_l": round(km / comb, 2),
                    "l_km": round(l_km, 4),
                    "km": round(km, 2),
                    "combustible_L": round(comb, 2)
                })

        GAL_POR_LITRO = 1 / 3.785
        if consumos_l_km:
            avg_l_km = round(sum(consumos_l_km) / len(consumos_l_km), 4)
            avg_km_l = round(1 / avg_l_km, 2)
            avg_km_gal = round(avg_km_l / GAL_POR_LITRO, 2)
        else:
            avg_l_km = 0.35
            avg_km_l = round(1 / 0.35, 2)
            avg_km_gal = round(avg_km_l / GAL_POR_LITRO, 2)

        resumen_vehiculos = {
            vid: {
                "promedio_km_l": round(sum(v["km_l"] for v in viajes) / len(viajes), 2),
                "viajes": len(viajes)
            }
            for vid, viajes in por_vehiculo.items()
        }

        return {
            "status": "success",
            "data": {
                "promedio_historico_l_km": avg_l_km,
                "promedio_historico_km_l": avg_km_l,
                "promedio_historico_km_gal": avg_km_gal,
                "total_viajes_con_datos": len(consumos_l_km),
                "umbral_alerta_pct": 15,
                "por_vehiculo": resumen_vehiculos,
                "fuente": "historico" if consumos_l_km else "constante_base"
            }
        }
    except Exception as e:
        print(f"[rendimiento-combustible] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
