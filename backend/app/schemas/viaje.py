"""Contratos de entrada/salida del dominio Viajes."""
from pydantic import BaseModel


class ViajeIniciar(BaseModel):
    id_vehiculo: str
    origen_nombre: str
    origen_lat: float
    origen_lng: float
    destino_nombre: str
    destino_lat: float
    destino_lng: float
    km_inicio: float
    reposicion_origen_nombre: str | None = None
    reposicion_origen_lat: float | None = None
    reposicion_origen_lng: float | None = None
    reposicion_distancia_km: float | None = None
    ubicacion_inicial_lat: float | None = None
    ubicacion_inicial_lng: float | None = None
    ubicacion_inicial_nombre: str | None = None


class ViajeFinalizar(BaseModel):
    id_vehiculo: str
    km_fin: float
