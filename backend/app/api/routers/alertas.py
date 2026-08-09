"""Endpoints de alertas operativas y registro de emergencias."""
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion
from app.schemas.alerta import EmergenciaRequest

router = APIRouter(tags=["Alertas"])
logger = get_logger("api.alertas")
db = get_db()

@router.get("/api/alertas")
def listar_alertas(estado: str = None):
    """Obtener alertas, opcionalmente filtradas por estado"""
    try:
        alertas_ref = db.collection('alertas')
        
        if estado:
            alertas_ref = alertas_ref.where('estado', '==', estado)
        
        alertas_ref = alertas_ref.order_by('fecha_creacion', direction='DESCENDING').limit(50)
        docs = alertas_ref.stream()
        
        def _to_iso(val):
            if val is None:
                return None
            if isinstance(val, str):
                return val
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return str(val)

        alertas = []
        for doc in docs:
            try:
                alerta = doc.to_dict()
                alerta['id'] = doc.id
                for campo in ('fecha_creacion', 'fecha_limite', 'fecha_resolucion'):
                    if campo in alerta:
                        alerta[campo] = _to_iso(alerta[campo])
                alertas.append(alerta)
            except Exception as doc_err:
                print(f"⚠️ Error procesando alerta {doc.id}: {doc_err}")
        
        return {"status": "success", "data": alertas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/api/alertas/emergencia")
def registrar_emergencia(datos: EmergenciaRequest):
    """Conductor finaliza viaje abruptamente — notifica a admin y conductores"""
    try:
        mensaje = (
            f"EMERGENCIA: El conductor del vehiculo {datos.id_vehiculo} "
            f"({datos.email_conductor}) finalizó el viaje abruptamente. "
            f"Motivo: {datos.motivo or 'No especificado'}"
        )
        alerta_doc = {
            "tipo_alerta": "EMERGENCIA_CONDUCTOR",
            "id_vehiculo": datos.id_vehiculo,
            "email_conductor": datos.email_conductor,
            "mensaje": mensaje,
            "gravedad": "alta",
            "estado": "Pendiente",
            "destinatarios": ["admin", "todos_conductores"],
            "requiere_atencion": True,
            "fecha_creacion": datetime.now()
        }
        db.collection("alertas").add(alerta_doc)

        incidente_doc = {
            "tipo": "EMERGENCIA_CONDUCTOR",
            "id_vehiculo": datos.id_vehiculo,
            "descripcion": mensaje,
            "estado": "activo",
            "fecha": datetime.now()
        }
        db.collection("incidentes_flota").add(incidente_doc)

        print(f"🚨 Emergencia registrada para {datos.id_vehiculo} por {datos.email_conductor}")
        return {"status": "success", "message": "Alerta de emergencia registrada y notificada"}
    except Exception as e:
        print(f"❌ Error registrando emergencia: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/alertas/{id_alerta}")
def actualizar_alerta(id_alerta: str, estado: str = None, notas: str = None):
    """Marcar una alerta como resuelta"""
    try:
        doc_ref = db.collection('alertas').document(id_alerta)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Alerta no encontrada")
        
        update_data = {}
        if estado:
            update_data['estado'] = estado
        if estado == 'Resuelta':
            update_data['fecha_resolucion'] = datetime.now()
            update_data['requiere_accion'] = False
        if notas:
            update_data['notas_resolucion'] = notas
        
        if update_data:
            doc_ref.update(update_data)
        
        return {"status": "success", "mensaje": f"Alerta {id_alerta} actualizada"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

