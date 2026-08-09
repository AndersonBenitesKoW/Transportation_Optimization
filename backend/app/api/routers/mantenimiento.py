"""Endpoints de alertas de mantenimiento preventivo por desgaste de componentes."""
from fastapi import APIRouter, HTTPException

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion

router = APIRouter(tags=["Mantenimiento"])
logger = get_logger("api.mantenimiento")
db = get_db()

@router.get("/api/mantenimiento-alertas")
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
                umbral = datos.get('kilometraje_reparacion', 0)
                km_desde_reparacion = datos.get('km_desde_reparacion', 0)
                tiempo_vida = datos.get('tiempo_vida', 0)

                if umbral <= 0 and tiempo_vida <= 0:
                    continue

                # Porcentaje: avance de km_desde_reparacion hacia el umbral de alerta
                pct = (km_desde_reparacion / umbral) if umbral > 0 else (1.0 if tiempo_vida <= 0 else 0)

                if pct >= UMBRAL_MANTENIMIENTO_PCT or tiempo_vida <= 0:
                    tipo_alerta = 'cambio_pieza' if tiempo_vida <= 0 else 'mantenimiento_preventivo'
                    gravedad = 'critico' if tiempo_vida <= 0 else 'advertencia'

                    alertas.append({
                        "id_vehiculo": vid,
                        "componente": nombre_comp,
                        "km_desde_reparacion": km_desde_reparacion,
                        "tiempo_vida_km": tiempo_vida,
                        "porcentaje_desgaste": round(pct * 100, 1),
                        "tipo_alerta": tipo_alerta,
                        "gravedad": gravedad,
                        "mensaje": f"{nombre_comp.capitalize()} de {vid} al {round(pct*100,1)}% del umbral ({km_desde_reparacion}/{umbral} km). Vida restante: {tiempo_vida} km. {'Se requiere cambio inmediato.' if tiempo_vida <= 0 else 'Proximo a requerir mantenimiento.'}",
                        "conductor_asignado": vehiculo.get('conductor_asignado', '')
                    })

        alertas.sort(key=lambda x: x['porcentaje_desgaste'], reverse=True)
        return {"status": "success", "data": alertas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
