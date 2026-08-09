"""Endpoints de indicadores agregados de la flota."""
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion

router = APIRouter(tags=["KPIs"])
logger = get_logger("api.kpis")
db = get_db()

@router.get("/api/kpis")
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
