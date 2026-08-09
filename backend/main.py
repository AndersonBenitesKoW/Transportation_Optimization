"""Punto de arranque compatible con `uvicorn main:app --reload`.

La aplicacion real vive en `app/main.py`, organizada por capas. Este archivo
solo reexporta la instancia para no romper el comando de ejecucion existente.

Recomendado a futuro: `uvicorn app.main:app --reload`
"""
from app.main import app

__all__ = ["app"]
