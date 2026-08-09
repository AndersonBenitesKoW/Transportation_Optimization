"""Contratos de entrada/salida del asistente conversacional."""
from pydantic import BaseModel


class MensajeChat(BaseModel):
    mensaje: str
    rol: str
    referencia: str
