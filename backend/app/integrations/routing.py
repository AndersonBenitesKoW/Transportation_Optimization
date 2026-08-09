"""Adaptador del servicio de ruteo OSRM (Open Source Routing Machine).

Aisla el detalle del proveedor de rutas. Ante cualquier fallo devuelve un
estado controlado (None, 0) para que el flujo principal no se caiga.
"""
import requests

from app.core.logging import get_logger, log_excepcion

logger = get_logger("integrations.routing")

TIMEOUT_SEGUNDOS = 10


class RoutingEngine:
    """Calcula rutas por carretera contra el servidor publico de OSRM."""

    def __init__(self) -> None:
        self.base_url = "http://router.project-osrm.org/route/v1/driving/"

    def obtener_ruta_optima(self, origen_lat, origen_lng, destino_lat, destino_lng):
        """Calcula la ruta optima por carretera.

        Devuelve: (lista_coordenadas_lat_lng, distancia_en_km) o (None, 0) si falla.
        """
        try:
            # OSRM espera el formato: longitud,latitud;longitud,latitud
            coords_str = f"{origen_lng},{origen_lat};{destino_lng},{destino_lat}"
            url = f"{self.base_url}{coords_str}?overview=full&geometries=geojson"

            response = requests.get(
                url, headers={"User-Agent": "FleetMindAI/1.0"}, timeout=TIMEOUT_SEGUNDOS
            )
            data = response.json()

            if data.get("code") != "Ok":
                logger.warning("OSRM respondio code=%s para %s", data.get("code"), coords_str)
                return None, 0

            # Convertimos [Lng, Lat] de GeoJSON a [Lat, Lng] para Leaflet
            coordenadas_optimas = [[p[1], p[0]] for p in data["routes"][0]["geometry"]["coordinates"]]
            distancia_km = round(data["routes"][0]["distance"] / 1000, 2)

            logger.info("OSRM: ruta calculada con %s km y %s puntos.", distancia_km, len(coordenadas_optimas))
            return coordenadas_optimas, distancia_km

        except Exception as e:
            log_excepcion(logger, "Error consultando OSRM", e)
            return None, 0


routing_engine = RoutingEngine()
