"""Endpoints de consulta de predicciones generadas por los modelos ML."""
from fastapi import APIRouter, HTTPException

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion

router = APIRouter(tags=["Predicciones"])
logger = get_logger("api.predicciones")
db = get_db()

# --- PREDICCIONES ---
@router.get("/api/predicciones")
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

@router.get("/api/predicciones/{id_vehiculo}")
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

