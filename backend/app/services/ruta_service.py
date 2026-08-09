"""Reglas de negocio para evaluar si una ruta solicitada es viable.

Aqui viven las condiciones operativas (distancia maxima, estado del motor,
combustible disponible). No conoce FastAPI ni Firestore: recibe datos y
devuelve una decision, por lo que puede probarse de forma aislada.
"""
import json

from app.core.logging import get_logger, log_excepcion
from app.integrations.geocoding import geocodificar_destino
from app.integrations.routing import routing_engine

logger = get_logger("services.ruta")

DISTANCIA_MAXIMA_KM = 200
CONSUMO_POR_KM = 0.35


def parsear_intencion(respuesta_ia: str) -> dict:
    """Extrae el JSON de intencion devuelto por la IA.

    Si la IA responde algo no parseable se asume que no hay cambio de ruta.
    """
    try:
        limpio = respuesta_ia.replace('```json', '').replace('```', '').strip()
        return json.loads(limpio)
    except Exception as e:
        log_excepcion(logger, f"Respuesta de intencion no parseable: {respuesta_ia!r}", e)
        return {"quiere_ir": False, "destino": None}


def evaluar_cambio_de_ruta(referencia: str, data: dict, destino_solicitado: str) -> tuple[str, dict | None]:
    """Evalua un cambio de destino solicitado por el conductor.

    Devuelve (system_prompt, actualizacion_db). `actualizacion_db` es None
    cuando la ruta se rechaza o no se pudo calcular.
    """
    logger.info("Geocodificando destino solicitado: '%s'", destino_solicitado)
    geo = geocodificar_destino(destino_solicitado)

    if geo is None:
        prompt = (
            f"El conductor pidio ir a '{destino_solicitado}' pero no se encontro en el mapa. "
            "Dile que sea mas especifico (incluye distrito y provincia)."
        )
        return prompt, None

    nombre_destino, lat_dest, lng_dest = geo
    destino_nuevo = {"nombre": nombre_destino, "lat": lat_dest, "lng": lng_dest}

    try:
        puntos_ruta, dist_km = routing_engine.obtener_ruta_optima(
            data['ubicacion']['lat'], data['ubicacion']['lng'], lat_dest, lng_dest
        )
    except Exception as e:
        log_excepcion(logger, "Error calculando la ruta optima", e)
        return "Dile al usuario que hubo un error de GPS al trazar la ruta.", None

    if not puntos_ruta:
        return "Dile al usuario que hubo un error de GPS al trazar la ruta.", None

    consumo_est = round(dist_km * CONSUMO_POR_KM, 2)
    combustible_ok = data['combustible_actual_L'] >= consumo_est
    motor_ok = data['estado_motor'] == 'Optimo'

    actualizacion_db = None

    if dist_km > DISTANCIA_MAXIMA_KM:
        viabilidad = (
            f"RECHAZADA. Destino a {dist_km} km, demasiado lejos "
            f"(maximo {DISTANCIA_MAXIMA_KM} km por mision)."
        )
    elif not motor_ok:
        viabilidad = "RECHAZADA. Peligro de falla mecanica."
    elif not combustible_ok:
        viabilidad = (
            f"RECHAZADA. Combustible insuficiente "
            f"(necesita {consumo_est}L, tienes {data['combustible_actual_L']}L)."
        )
    else:
        viabilidad = "APROBADA."
        from datetime import datetime

        actualizacion_db = {
            "puntos_ruta": [{"lat": p[0], "lng": p[1]} for p in puntos_ruta],
            "destino": destino_nuevo,
            "distancia_restante_km": dist_km,
            "mision": f"Ruta AI a {nombre_destino}",
            "ultima_actualizacion": datetime.now(),
        }

    system_prompt = f"""
                        Eres el asistente de {referencia}.
                        Nuevo destino: {nombre_destino} a {dist_km} km.
                        Consumo estimado: {consumo_est} L. Combustible actual: {data['combustible_actual_L']} L.
                        Estado motor: {data['estado_motor']}.
                        Resultado de evaluacion: {viabilidad}
                        REGLAS:
                        1. Se directo. No uses Markdown (ni asteriscos).
                        2. Explica si aprobaste o rechazaste la ruta segun el combustible, motor y distancia.
                        3. Si el destino esta a mas de {DISTANCIA_MAXIMA_KM} km, explica que excede el limite de mision.
                        4. Si aprobaste, dile que ya actualizaste el mapa.
                        """

    return system_prompt, actualizacion_db


def prompt_consulta_normal(referencia: str, data: dict) -> str:
    """Prompt para preguntas del conductor que no implican cambio de ruta."""
    return f"""
                Eres el asistente de {referencia}.
                Destino actual: {data['destino']['nombre']} a {data['distancia_restante_km']} km.
                Combustible: {data['combustible_actual_L']}L. Motor: {data['estado_motor']}.
                Consumo estimado = Distancia * {CONSUMO_POR_KM}L/km.
                REGLAS: Se breve, no uses Markdown (asteriscos).
                """
