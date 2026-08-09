"""Endpoints de desplazamientos de reposicion."""
from fastapi import APIRouter, HTTPException

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion

router = APIRouter(tags=["Desplazamientos"])
logger = get_logger("api.desplazamientos")
db = get_db()

@router.get("/api/desplazamientos")
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
