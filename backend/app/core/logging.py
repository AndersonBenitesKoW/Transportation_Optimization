"""Logging centralizado del backend.

Unico punto donde se configura la salida de logs. El resto de modulos debe
usar `get_logger(__name__)` en lugar de `print`, para que los errores queden
siempre visibles en consola con su origen y traceback.
"""
import logging
import sys
import traceback

_CONFIGURADO = False


def _configurar() -> None:
    global _CONFIGURADO
    if _CONFIGURADO:
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("[%(asctime)s] %(levelname)-8s %(name)s | %(message)s", datefmt="%H:%M:%S")
    )

    root = logging.getLogger("fleetmind")
    root.setLevel(logging.INFO)
    root.handlers.clear()
    root.addHandler(handler)
    root.propagate = False

    _CONFIGURADO = True


def get_logger(nombre: str) -> logging.Logger:
    """Devuelve un logger namespaced bajo 'fleetmind'."""
    _configurar()
    return logging.getLogger(f"fleetmind.{nombre}")


def log_excepcion(logger: logging.Logger, contexto: str, error: Exception) -> None:
    """Registra una excepcion con su tipo, mensaje y traceback completo.

    Regla del proyecto: ningun bloque except queda silencioso.
    """
    logger.error("%s | %s: %s", contexto, type(error).__name__, error)
    traceback.print_exc()
