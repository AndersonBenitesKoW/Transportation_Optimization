"""Carga y ejecucion de los modelos de Machine Learning.

Aisla joblib y pandas del resto del sistema. Si un modelo no carga, la API
sigue funcionando: los metodos devuelven None y quedan registrados en consola.
"""
from datetime import datetime

import joblib
import pandas as pd

from app.core.config import settings
from app.core.logging import get_logger, log_excepcion

logger = get_logger("ml.predictor")


class Predictor:
    """Encapsula los modelos de prediccion de fallas y anomalias."""

    def __init__(self) -> None:
        self.modelo_fallas = self._cargar(settings.MODELO_FALLAS_PATH, "fallas")
        self.modelo_anomalias = self._cargar(settings.MODELO_ANOMALIAS_PATH, "anomalias")

    def _cargar(self, ruta: str, nombre: str):
        try:
            modelo = joblib.load(ruta)
            logger.info("Modelo '%s' cargado desde %s", nombre, ruta)
            return modelo
        except Exception as e:
            log_excepcion(logger, f"No se pudo cargar el modelo '{nombre}' ({ruta})", e)
            return None

    def predecir_falla(self, datos_camion: dict) -> dict | None:
        """Predice riesgo de falla mecanica. Devuelve None si el modelo no esta disponible."""
        if not self.modelo_fallas:
            return None
        try:
            entrada = {
                "kilometraje": datos_camion.get("kilometraje", 0),
                "edad_motor_meses": datos_camion.get("edad_motor_meses", 0),
                "horas_conduccion": datos_camion.get("horas_conduccion", 0),
                "temperatura_motor": datos_camion.get("temperatura_motor", 0),
            }
            df = pd.DataFrame([entrada])
            pred = self.modelo_fallas.predict(df)[0]
            prob = self.modelo_fallas.predict_proba(df)[0]
            probabilidad = float(prob[1]) if pred == 1 else float(prob[0])
            resultado = "Peligro de Falla" if pred == 1 else "Operación Segura"

            return {
                "id_vehiculo": datos_camion.get("id_camion"),
                "tipo_prediccion": "Falla Mecánica",
                "resultado": resultado,
                "probabilidad": probabilidad,
                "confianza": "Alta" if probabilidad > 0.8 else "Media" if probabilidad > 0.5 else "Baja",
                "datos_entrada": entrada,
                "recomendacion": (
                    "Programar mantenimiento preventivo urgente" if pred == 1 else "Continuar operación normal"
                ),
                "fecha_prediccion": datetime.now(),
                "modelo_usado": "modelo_fallas.joblib",
                "version_modelo": "1.0",
                "_etiqueta_alerta": f"⚠️ {resultado}" if pred == 1 else f"✅ {resultado}",
            }
        except Exception as e:
            log_excepcion(logger, "Error prediciendo falla mecanica", e)
            return None

    def detectar_anomalia(self, datos_camion: dict) -> dict | None:
        """Detecta anomalia de combustible. Devuelve None si no hay anomalia o modelo."""
        if not self.modelo_anomalias:
            return None
        try:
            consumo_minuto = datos_camion.get("consumo_instante", 0)
            entrada = {"consumo_por_minuto": consumo_minuto, "velocidad": 45.0}
            es_anomalo = self.modelo_anomalias.predict(pd.DataFrame([entrada]))[0]

            if es_anomalo != -1:
                return {"_es_anomalo": False}

            return {
                "_es_anomalo": True,
                "id_vehiculo": datos_camion.get("id_camion"),
                "tipo_prediccion": "Anomalía Combustible",
                "resultado": "Anomalía Detectada",
                "probabilidad": 0.95,
                "confianza": "Muy Alta",
                "datos_entrada": entrada,
                "recomendacion": "Inspeccionar tanque de combustible. Posible fuga o robo.",
                "fecha_prediccion": datetime.now(),
                "modelo_usado": "modelo_anomalias.joblib",
                "version_modelo": "1.0",
            }
        except Exception as e:
            log_excepcion(logger, "Error detectando anomalia de combustible", e)
            return None


predictor = Predictor()
