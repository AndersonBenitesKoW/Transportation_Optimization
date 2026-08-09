"""Contratos de entrada/salida del dominio Vehiculos y sus componentes."""
from datetime import datetime

from pydantic import BaseModel


class VehiculoCreate(BaseModel):
    id_vehiculo: str
    placa: str
    marca: str
    modelo: str
    anio: int
    capacidad_tanque_L: float
    capacidad_carga_ton: float
    kilometraje_actual: float
    edad_motor_meses: int
    estado: str
    conductor_asignado: str


class VehiculoUpdate(BaseModel):
    placa: str | None = None
    marca: str | None = None
    modelo: str | None = None
    anio: int | None = None
    capacidad_tanque_L: float | None = None
    capacidad_carga_ton: float | None = None
    kilometraje_actual: float | None = None
    edad_motor_meses: int | None = None
    estado: str | None = None
    conductor_asignado: str | None = None


class ComponenteData(BaseModel):
    kilometraje_reparacion: float = 0.0
    tiempo_vida: float = 0.0
    km_en_ultima_reparacion: float = 0.0
    km_desde_reparacion: float = 0.0
    ultima_reparacion: datetime | None = None
    proxima_reparacion: datetime | None = None


class ComponentesVehiculo(BaseModel):
    motor: ComponenteData | None = None
    aceite: ComponenteData | None = None
    neumaticos: ComponenteData | None = None
    zapatas: ComponenteData | None = None
    mangueras: ComponenteData | None = None
    fajas: ComponenteData | None = None
