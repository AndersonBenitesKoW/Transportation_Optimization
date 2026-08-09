"""Registro central de routers de la API.

Agregar un nuevo dominio a la API consiste en crear su modulo aqui e
incluirlo en `ROUTERS`. `app.main` no necesita cambiar.
"""
from app.api.routers import (
    alertas,
    chat,
    conductores,
    desplazamientos,
    flota,
    incidentes,
    kpis,
    mantenimiento,
    predicciones,
    rendimiento,
    usuarios,
    vehiculos,
    viajes,
)

ROUTERS = [
    flota.router,
    incidentes.router,
    chat.router,
    vehiculos.router,
    conductores.router,
    predicciones.router,
    alertas.router,
    kpis.router,
    viajes.router,
    rendimiento.router,
    desplazamientos.router,
    mantenimiento.router,
    usuarios.router,
]

__all__ = ["ROUTERS"]
