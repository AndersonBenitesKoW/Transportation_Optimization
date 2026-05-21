import requests

class RoutingEngine:
    def __init__(self):
        # Servidor público de demostración de OSRM (Open Source Routing Machine)
        self.base_url = "http://router.project-osrm.org/route/v1/driving/"

    def obtener_ruta_optima(self, origen_lat, origen_lng, destino_lat, destino_lng):
        """
        Calcula la ruta óptima por carretera.
        Devuelve: (lista_coordenadas_lat_lng, distancia_en_km)
        """
        try:
            # OSRM espera el formato: longitud,latitud;longitud,latitud
            coords_str = f"{origen_lng},{origen_lat};{destino_lng},{destino_lat}"
            url = f"{self.base_url}{coords_str}?overview=full&geometries=geojson"
            
            response = requests.get(url, headers={"User-Agent": "FleetMindAI/1.0"})
            data = response.json()

            if data['code'] != 'Ok':
                return None, 0

            # Convertimos [Lng, Lat] de GeoJSON a [Lat, Lng] para Leaflet
            coordenadas_optimas = [[p[1], p[0]] for p in data['routes'][0]['geometry']['coordinates']]
            
            distancia_km = round(data['routes'][0]['distance'] / 1000, 2)
            
            print(f"🌍 OSRM: Ruta calculada con {distancia_km} km y {len(coordenadas_optimas)} puntos.")
            return coordenadas_optimas, distancia_km

        except Exception as e:
            print(f"❌ Error en OSRM: {e}")
            return None, 0

routing_engine = RoutingEngine()