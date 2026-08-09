"""Adaptador de geocodificacion (Nominatim / OpenStreetMap).

Convierte nombres de lugares en coordenadas. Mantiene una cache en memoria y
un catalogo de destinos conocidos para evitar llamadas de red innecesarias.
"""
import time

import requests

from app.core.logging import get_logger, log_excepcion

logger = get_logger("integrations.geocoding")

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
TIMEOUT_SEGUNDOS = 5
PAUSA_ENTRE_LLAMADAS = 1.1  # Nominatim exige max 1 peticion por segundo

# Destinos conocidos del area de operacion (Trujillo)
DESTINOS = {
    "taller norte": {"nombre": "Taller Norte", "lat": -8.1065, "lng": -79.0201},
    "almacen laredo": {"nombre": "Almacén Laredo", "lat": -8.1150, "lng": -79.0350},
    "parada sur": {"nombre": "Parada Sur", "lat": -8.1250, "lng": -79.0180},
    "taller sur": {"nombre": "Taller Sur", "lat": -8.1120, "lng": -79.0320},
}

_coordenadas_cache: dict[str, tuple] = {}


def geocodificar_destino(nombre: str):
    """Convierte un nombre de lugar en (nombre, lat, lng). Devuelve None si no se encuentra."""
    try:
        nombre_limpio = nombre.strip().lower()
    except Exception as e:
        log_excepcion(logger, f"Nombre de destino invalido: {nombre!r}", e)
        return None

    if nombre_limpio in _coordenadas_cache:
        logger.info("Cache: %s -> %s", nombre_limpio, _coordenadas_cache[nombre_limpio])
        return _coordenadas_cache[nombre_limpio]

    if nombre_limpio in DESTINOS:
        d = DESTINOS[nombre_limpio]
        resultado = (d["nombre"], d["lat"], d["lng"])
        _coordenadas_cache[nombre_limpio] = resultado
        return resultado

    try:
        params = {
            "q": nombre,
            "format": "json",
            "limit": 1,
            "countrycodes": "pe",
            "accept-language": "es",
        }
        headers = {"User-Agent": "FleetMindAI/1.0"}
        resp = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=TIMEOUT_SEGUNDOS)
        data = resp.json()

        if data and len(data) > 0:
            lat = float(data[0]["lat"])
            lng = float(data[0]["lon"])
            nombre_encontrado = data[0].get("display_name", nombre)
            resultado = (nombre_encontrado, lat, lng)
            _coordenadas_cache[nombre_limpio] = resultado
            logger.info("Nominatim: '%s' -> %s (%s, %s)", nombre, nombre_encontrado, lat, lng)
            time.sleep(PAUSA_ENTRE_LLAMADAS)
            return resultado

        logger.warning("Nominatim no encontro: '%s'", nombre)
        return None
    except Exception as e:
        log_excepcion(logger, f"Error geocodificando '{nombre}'", e)
        return None
