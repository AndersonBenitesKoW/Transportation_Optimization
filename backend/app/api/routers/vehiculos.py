"""Endpoints CRUD de vehiculos y su subcoleccion de componentes."""
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion
from app.schemas.vehiculo import ComponenteData, VehiculoCreate, VehiculoUpdate

router = APIRouter(tags=["Vehiculos"])
logger = get_logger("api.vehiculos")
db = get_db()

@router.get("/api/vehiculos")
def listar_vehiculos():
    """Obtener todos los vehículos"""
    try:
        vehiculos_ref = db.collection('vehiculos')
        docs = vehiculos_ref.stream()
        
        vehiculos = []
        for doc in docs:
            vehiculo = doc.to_dict()
            vehiculo['id'] = doc.id
            
            # Convertir fechas a ISO format
            if 'fecha_adquisicion' in vehiculo:
                vehiculo['fecha_adquisicion'] = vehiculo['fecha_adquisicion'].isoformat()
            if 'ultimo_mantenimiento' in vehiculo:
                vehiculo['ultimo_mantenimiento'] = vehiculo['ultimo_mantenimiento'].isoformat()
            
            vehiculos.append(vehiculo)
        
        return {"status": "success", "data": vehiculos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/vehiculos/{id_vehiculo}")
def obtener_vehiculo(id_vehiculo: str):
    """Obtener un vehículo específico"""
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")
        
        vehiculo = doc.to_dict()
        vehiculo['id'] = doc.id
        
        # Convertir fechas
        if 'fecha_adquisicion' in vehiculo:
            vehiculo['fecha_adquisicion'] = vehiculo['fecha_adquisicion'].isoformat()
        if 'ultimo_mantenimiento' in vehiculo:
            vehiculo['ultimo_mantenimiento'] = vehiculo['ultimo_mantenimiento'].isoformat()
        
        return {"status": "success", "data": vehiculo}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/vehiculos")
def crear_vehiculo(vehiculo: VehiculoCreate):
    """Crear un nuevo vehículo"""
    try:
        # Verificar si ya existe
        doc_ref = db.collection('vehiculos').document(vehiculo.id_vehiculo)
        if doc_ref.get().exists:
            raise HTTPException(status_code=400, detail="El vehículo ya existe")
        
        # Crear documento
        vehiculo_data = vehiculo.model_dump()
        vehiculo_data['fecha_adquisicion'] = datetime.now()
        vehiculo_data['ultimo_mantenimiento'] = datetime.now()
        vehiculo_data['proximo_mantenimiento_km'] = vehiculo.kilometraje_actual + 5000
        
        doc_ref.set(vehiculo_data)
        
        return {
            "status": "success",
            "mensaje": f"Vehículo {vehiculo.id_vehiculo} creado exitosamente",
            "data": {"id": vehiculo.id_vehiculo}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/vehiculos/{id_vehiculo}")
def actualizar_vehiculo(id_vehiculo: str, vehiculo: VehiculoUpdate):
    """Actualizar un vehículo existente"""
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")
        
        # Actualizar solo campos proporcionados
        update_data = {k: v for k, v in vehiculo.model_dump().items() if v is not None}
        
        if update_data:
            doc_ref.update(update_data)
        
        return {
            "status": "success",
            "mensaje": f"Vehículo {id_vehiculo} actualizado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/vehiculos/{id_vehiculo}")
def eliminar_vehiculo(id_vehiculo: str):
    """Eliminar un vehículo"""
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")
        
        doc_ref.delete()
        
        return {
            "status": "success",
            "mensaje": f"Vehículo {id_vehiculo} eliminado exitosamente"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ============================================================================
# CRUD COMPONENTES (SUBCONLECCIÓN vehiculos/{id}/componentes)
# ============================================================================

@router.get("/api/vehiculos/{id_vehiculo}/componentes")
def obtener_componentes(id_vehiculo: str):
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")

        componentes_ref = db.collection('vehiculos').document(id_vehiculo).collection('componentes')
        docs = componentes_ref.stream()

        def _fecha_str(val):
            if val is None or isinstance(val, str):
                return val
            return val.isoformat() if hasattr(val, 'isoformat') else str(val)

        componentes = {}
        for doc in docs:
            try:
                data = doc.to_dict()
                if 'ultima_reparacion' in data and data['ultima_reparacion']:
                    data['ultima_reparacion'] = _fecha_str(data['ultima_reparacion'])
                if 'proxima_reparacion' in data and data['proxima_reparacion']:
                    data['proxima_reparacion'] = _fecha_str(data['proxima_reparacion'])
                componentes[doc.id] = data
            except Exception as doc_err:
                print(f"⚠️ Error procesando componente {doc.id}: {doc_err}")

        return {"status": "success", "data": componentes}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/vehiculos/{id_vehiculo}/componentes/{nombre_componente}")
def obtener_componente(id_vehiculo: str, nombre_componente: str):
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")

        comp_ref = db.collection('vehiculos').document(id_vehiculo).collection('componentes').document(nombre_componente)
        doc = comp_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail=f"Componente '{nombre_componente}' no encontrado")

        data = doc.to_dict()
        def _fs(v):
            if v is None or isinstance(v, str): return v
            return v.isoformat() if hasattr(v, 'isoformat') else str(v)
        if 'ultima_reparacion' in data and data['ultima_reparacion']:
            data['ultima_reparacion'] = _fs(data['ultima_reparacion'])
        if 'proxima_reparacion' in data and data['proxima_reparacion']:
            data['proxima_reparacion'] = _fs(data['proxima_reparacion'])

        return {"status": "success", "data": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/vehiculos/{id_vehiculo}/componentes")
def actualizar_componentes(id_vehiculo: str, componentes: dict[str, ComponenteData]):
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")

        actualizados = []

        for nombre, data in componentes.items():
            if data is not None:
                comp_ref = db.collection('vehiculos').document(id_vehiculo).collection('componentes').document(nombre)
                comp_ref.set(data.model_dump(), merge=True)
                actualizados.append(nombre)

        return {
            "status": "success",
            "mensaje": f"Componentes actualizados: {', '.join(actualizados)}" if actualizados else "Sin cambios"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/vehiculos/{id_vehiculo}/componentes/{nombre_componente}")
def eliminar_componente(id_vehiculo: str, nombre_componente: str):
    try:
        doc_ref = db.collection('vehiculos').document(id_vehiculo)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Vehículo no encontrado")

        comp_ref = db.collection('vehiculos').document(id_vehiculo).collection('componentes').document(nombre_componente)
        if not comp_ref.get().exists:
            raise HTTPException(status_code=404, detail=f"Componente '{nombre_componente}' no encontrado")

        comp_ref.delete()

        return {
            "status": "success",
            "mensaje": f"Componente '{nombre_componente}' eliminado"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
