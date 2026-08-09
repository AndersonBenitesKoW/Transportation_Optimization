"""Contratos de entrada/salida del dominio Alertas."""
from pydantic import BaseModel


class EmergenciaRequest(BaseModel):
    id_vehiculo: str
    email_conductor: str
    motivo: str | None = None
