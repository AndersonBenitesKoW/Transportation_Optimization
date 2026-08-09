"""Endpoints de gestion de usuarios, registro y autenticacion."""
from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion
from app.schemas.usuario import UsuarioCreate, UsuarioLogin, UsuarioUpdate

router = APIRouter(tags=["Usuarios"])
logger = get_logger("api.usuarios")
db = get_db()

@router.get("/api/usuarios")
def listar_usuarios():
    try:
        usuarios_ref = db.collection('usuarios')
        docs = usuarios_ref.stream()
        usuarios = []
        for doc in docs:
            u = doc.to_dict()
            u['id'] = doc.id
            usuarios.append(u)
        return {"status": "success", "data": usuarios}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/usuarios/register")
def registrar_usuario(usuario: UsuarioCreate):
    try:
        email_ref = db.collection('usuarios').where('email', '==', usuario.email).stream()
        if any(True for _ in email_ref):
            raise HTTPException(status_code=400, detail="El email ya esta registrado")

        uid = f"user_{usuario.email.split('@')[0]}"
        user_data = usuario.model_dump()
        db.collection('usuarios').document(uid).set(user_data)

        if usuario.rol == "CONDUCTOR":
            if usuario.id_conductor:
                id_conductor = usuario.id_conductor
                cond_ref = db.collection('conductores').document(id_conductor)
                if not cond_ref.get().exists:
                    raise HTTPException(status_code=400, detail=f"El conductor {id_conductor} no existe")
                user_data['id_conductor'] = id_conductor
            else:
                id_conductor = f"C-{uid}"
                user_data['id_conductor'] = id_conductor
                conductor_data = {
                    "id_conductor": id_conductor,
                    "nombre": usuario.nombre,
                    "licencia": "",
                    "telefono": usuario.telefono or "",
                    "email": usuario.email,
                    "experiencia_anios": 0,
                    "calificacion": 5.0,
                    "estado": "Disponible"
                }
                db.collection('conductores').document(id_conductor).set(conductor_data)

        return {
            "status": "success",
            "mensaje": f"Usuario {usuario.nombre} registrado exitosamente",
            "data": {"id": uid, **user_data}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/usuarios/login")
def login_usuario(credenciales: UsuarioLogin):
    try:
        email_ref = db.collection('usuarios').where('email', '==', credenciales.email).stream()
        docs = list(email_ref)
        if not docs:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        user = docs[0].to_dict()
        user['id'] = docs[0].id

        if user.get('password') != credenciales.password:
            raise HTTPException(status_code=401, detail="Contrasena incorrecta")

        vehiculo_asignado = None
        if user.get('rol') == 'CONDUCTOR':
            id_conductor = user.get('id_conductor') or f"C-{user['id']}"
            vehiculos = db.collection('vehiculos').where('conductor_asignado', '==', id_conductor).stream()
            for vdoc in vehiculos:
                vehiculo_asignado = vdoc.to_dict().get('id_vehiculo', vdoc.id)
                break
            user['ref'] = vehiculo_asignado

        return {"status": "success", "data": user}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/api/usuarios/{id_usuario}")
def actualizar_usuario(id_usuario: str, usuario: UsuarioUpdate):
    try:
        doc_ref = db.collection('usuarios').document(id_usuario)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        update_data = {k: v for k, v in usuario.model_dump().items() if v is not None}
        doc_ref.update(update_data)
        return {"status": "success", "mensaje": f"Usuario {id_usuario} actualizado"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/usuarios/{id_usuario}")
def eliminar_usuario(id_usuario: str):
    try:
        doc_ref = db.collection('usuarios').document(id_usuario)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        doc_ref.delete()
        return {"status": "success", "mensaje": f"Usuario {id_usuario} eliminado"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
