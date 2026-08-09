"""Adaptador del proveedor de IA generativa (OpenRouter).

Aisla el SDK de OpenAI del resto del sistema. Si la IA no esta configurada la
aplicacion sigue operativa: `disponible` queda en False y el router responde
un mensaje controlado en lugar de fallar.
"""
from openai import OpenAI

from app.core.config import settings
from app.core.logging import get_logger, log_excepcion

logger = get_logger("integrations.ai_client")


class AIClient:
    """Cliente de chat contra OpenRouter."""

    def __init__(self) -> None:
        self._client: OpenAI | None = None
        self.model = settings.OPENROUTER_MODEL
        self._inicializar()

    def _inicializar(self) -> None:
        if not settings.OPENROUTER_API_KEY:
            logger.warning("Chat IA deshabilitado (sin OPENROUTER_API_KEY). El resto del API funciona.")
            return
        try:
            self._client = OpenAI(
                base_url=settings.OPENROUTER_BASE_URL,
                api_key=settings.OPENROUTER_API_KEY,
            )
            logger.info("Cliente IA inicializado correctamente (base_url=%s)", self._client.base_url)
        except Exception as e:
            log_excepcion(logger, "Error al inicializar cliente IA", e)
            self._client = None

    @property
    def disponible(self) -> bool:
        return self._client is not None

    @property
    def base_url(self):
        return self._client.base_url if self._client else None

    def completar(self, system_prompt: str, mensaje_usuario: str, contexto: str = "") -> str | None:
        """Envia un prompt al modelo. Devuelve el texto o None si falla."""
        if not self._client:
            return None
        try:
            respuesta = self._client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": mensaje_usuario},
                ],
            )
            texto = respuesta.choices[0].message.content
            logger.info("Respuesta IA recibida %s: %s...", contexto, (texto or "")[:100])
            return texto
        except Exception as e:
            log_excepcion(logger, f"Error en llamada a OpenRouter {contexto}", e)
            return None


ai_client = AIClient()
