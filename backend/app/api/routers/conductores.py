"""Endpoints CRUD de conductores."""
from fastapi import APIRouter, HTTPException

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion
from app.schemas.conductor import ConductorCreate, ConductorUpdate

router = APIRouter(tags=["Conductores"])
logger = get_logger("api.conductores")
db = get_db()

@router.get("/api/conductores")
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

@router.get("/api/conductores/{id_conductor}")
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

@router.post("/api/conductores")
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

@router.put("/api/conductores/{id_conductor}")
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

@router.delete("/api/conductores/{id_conductor}")
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
