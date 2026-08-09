"""Contratos de entrada/salida del dominio Usuarios."""
from pydantic import BaseModel


class UsuarioCreate(BaseModel):
    nombre: str
    email: str
    password: str
    telefono: str | None = None
    rol: str = "CONDUCTOR"
    id_conductor: str | None = None


class UsuarioLogin(BaseModel):
    email: str
    password: str


class UsuarioUpdate(BaseModel):
    nombre: str | None = None
    email: str | None = None
    password: str | None = None
    telefono: str | None = None
    rol: str | None = None
