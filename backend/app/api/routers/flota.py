"""Endpoints de telemetria de flota enriquecida con predicciones ML.

El router solo coordina: pide los datos al repositorio de telemetria y delega
las predicciones al modulo `app.ml.predictor`. No contiene logica de modelos.
"""
from fastapi import APIRouter, HTTPException

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion
from app.ml.predictor import predictor

router = APIRouter(tags=["Flota"])
logger = get_logger("api.flota")
db = get_db()


@router.get("/api/flota")
def obtener_flota():
    """Devuelve la telemetria de la flota con alerta predictiva y deteccion de anomalias."""
    try:
        camiones_ref = db.collection(u'telemetria_flota')
        docs = camiones_ref.stream()

        flota = []
        for doc in docs:
            datos_camion = doc.to_dict()
            if 'ultima_actualizacion' in datos_camion:
                datos_camion['ultima_actualizacion'] = datos_camion['ultima_actualizacion'].isoformat()

            # --- PREDICCION DE FALLAS ---
            prediccion = predictor.predecir_falla(datos_camion)
            if prediccion:
                datos_camion["alerta_predictiva"] = prediccion.pop("_etiqueta_alerta")
                try:
                    db.collection('predicciones').add(prediccion)
                except Exception as e:
                    log_excepcion(logger, "No se pudo guardar la prediccion de falla", e)

            # --- DETECCION DE ANOMALIAS ---
            anomalia = predictor.detectar_anomalia(datos_camion)
            if anomalia:
                es_anomalo = anomalia.pop("_es_anomalo")
                datos_camion["anomalia_combustible"] = es_anomalo
                if es_anomalo:
                    try:
                        db.collection('predicciones').add(anomalia)
                    except Exception as e:
                        log_excepcion(logger, "No se pudo guardar la anomalia de combustible", e)

            flota.append(datos_camion)

        return {"status": "success", "data": flota}
    except Exception as e:
        log_excepcion(logger, "Error al obtener la flota", e)
        raise HTTPException(status_code=500, detail=str(e))
