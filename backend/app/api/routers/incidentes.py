"""Endpoints de incidentes de flota."""
from fastapi import APIRouter, HTTPException

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion

router = APIRouter(tags=["Incidentes"])
logger = get_logger("api.incidentes")
db = get_db()

@router.get("/api/incidentes")
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
