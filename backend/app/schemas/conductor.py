"""Contratos de entrada/salida del dominio Conductores."""
from pydantic import BaseModel


class ConductorCreate(BaseModel):
    id_conductor: str
    nombre: str
    licencia: str
    telefono: str
    email: str
    experiencia_anios: int
    calificacion: float


class ConductorUpdate(BaseModel):
    nombre: str | None = None
    licencia: str | None = None
    telefono: str | None = None
    email: str | None = None
    experiencia_anios: int | None = None
    calificacion: float | None = None
    estado: str | None = None
