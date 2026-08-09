"""Punto de entrada de la API FleetMind.

Responsabilidad unica: crear la aplicacion, aplicar middlewares y registrar
los routers. Ninguna regla de negocio vive en este archivo.
"""
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import ROUTERS
from app.core.config import settings
from app.core.logging import get_logger

# La consola de Windows por defecto no es UTF-8 y los logs contienen acentos
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception as e:  # pragma: no cover - depende del terminal
    print(f"[AVISO] No se pudo forzar la codificacion UTF-8 en consola: {e}")

logger = get_logger("main")


def crear_app() -> FastAPI:
    """Construye y configura la instancia de FastAPI."""
    aplicacion = FastAPI(title=settings.APP_NAME, description=settings.APP_DESCRIPTION)

    aplicacion.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router in ROUTERS:
        aplicacion.include_router(router)

    logger.info("Routers registrados: %s", len(ROUTERS))
    return aplicacion


settings.resumen()
app = crear_app()


@app.get("/")
def read_root():
    return {"status": "success", "mensaje": "API en línea"}
