"""Contratos (modelos Pydantic) agrupados por dominio.

Reexporta los schemas para permitir imports cortos:
    from app.schemas import VehiculoCreate
"""
from app.schemas.alerta import EmergenciaRequest
from app.schemas.chat import MensajeChat
from app.schemas.conductor import ConductorCreate, ConductorUpdate
from app.schemas.usuario import UsuarioCreate, UsuarioLogin, UsuarioUpdate
from app.schemas.vehiculo import (
    ComponenteData,
    ComponentesVehiculo,
    VehiculoCreate,
    VehiculoUpdate,
)
from app.schemas.viaje import ViajeFinalizar, ViajeIniciar

__all__ = [
    "EmergenciaRequest",
    "MensajeChat",
    "ConductorCreate",
    "ConductorUpdate",
    "UsuarioCreate",
    "UsuarioLogin",
    "UsuarioUpdate",
    "ComponenteData",
    "ComponentesVehiculo",
    "VehiculoCreate",
    "VehiculoUpdate",
    "ViajeFinalizar",
    "ViajeIniciar",
]
