"""Endpoint del asistente conversacional (IA generativa).

El router unicamente coordina: consulta la telemetria, pide a la IA que
interprete la intencion y delega la decision de viabilidad a
`app.services.ruta_service`. Las reglas de negocio no viven aqui.
"""
from fastapi import APIRouter

from app.core.firebase import get_db
from app.core.logging import get_logger, log_excepcion
from app.integrations.ai_client import ai_client
from app.schemas.chat import MensajeChat
from app.services.ruta_service import (
    evaluar_cambio_de_ruta,
    parsear_intencion,
    prompt_consulta_normal,
)

router = APIRouter(tags=["Chat"])
logger = get_logger("api.chat")
db = get_db()

PROMPT_SISTEMA_ADMIN = "Eres FleetMind AI, analista logistico. No uses Markdown."
PROMPT_SISTEMA_INTENCION = "Responde UNICAMENTE en JSON valido, sin bloques de codigo ni markdown."


def _construir_prompt_intencion(mensaje: str) -> str:
    return f"""
            El conductor dice: "{mensaje}".
            Determina si quiere cambiar su ruta hacia un nuevo destino.
            Responde ÚNICAMENTE en JSON sin Markdown:
            {{"quiere_ir": true/false, "destino": "nombre completo del lugar" o null}}
            Si quiere ir a un lugar, escribe el nombre completo (ej: "Chao, Viru, La Libertad").
            Si no menciona un lugar concreto, pon false y null.
            """


@router.post("/api/chat")
async def procesar_chat(req: MensajeChat):
    """Procesa un mensaje del conductor o del administrador."""
    if not ai_client.disponible:
        return {
            "respuesta": "El asistente IA no está configurado. "
                         "Agrega OPENROUTER_API_KEY al archivo .env del backend."
        }

    try:
        logger.info("Chat recibido: rol=%s ref=%s mensaje=%.80s", req.rol, req.referencia, req.mensaje)

        system_prompt = PROMPT_SISTEMA_ADMIN
        actualizacion_db = None
        doc_ref = None

        if req.rol == "CONDUCTOR":
            doc_ref = db.collection(u'telemetria_flota').document(req.referencia)
            doc = doc_ref.get()

            if not doc.exists:
                logger.warning("Documento %s no encontrado en telemetria_flota", req.referencia)
                return {"respuesta": "No tengo conexión con tu telemetría."}

            data = doc.to_dict()

            # --- 1. La IA detecta la intencion del conductor ---
            resp_intencion = ai_client.completar(
                PROMPT_SISTEMA_INTENCION,
                _construir_prompt_intencion(req.mensaje),
                contexto="(deteccion de intencion)",
            )
            if resp_intencion is None:
                return {"respuesta": "Error al contactar la IA (intención). Revisa los logs del servidor."}

            intencion = parsear_intencion(resp_intencion)

            # --- 2. Evaluacion y ruteo ---
            if intencion.get('quiere_ir') and intencion.get('destino'):
                system_prompt, actualizacion_db = evaluar_cambio_de_ruta(
                    req.referencia, data, intencion['destino']
                )
            else:
                system_prompt = prompt_consulta_normal(req.referencia, data)

        # --- 3. Respuesta final ---
        respuesta_texto = ai_client.completar(system_prompt, req.mensaje, contexto="(respuesta final)")
        if respuesta_texto is None:
            return {"respuesta": "Error al generar respuesta con IA. Revisa los logs del servidor."}

        # Solo persistimos la nueva ruta si la evaluacion la aprobo
        if actualizacion_db and doc_ref is not None:
            try:
                doc_ref.update(actualizacion_db)
                logger.info("Ruta actualizada en Firebase para %s", req.referencia)
            except Exception as e:
                log_excepcion(logger, f"No se pudo actualizar la ruta de {req.referencia}", e)

        return {"respuesta": respuesta_texto}

    except Exception as e:
        log_excepcion(logger, "Error no controlado en el chatbot", e)
        return {"respuesta": f"Error de conexión con IA. ({type(e).__name__})"}
