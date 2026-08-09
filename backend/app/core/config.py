"""Configuracion centralizada leida desde variables de entorno.

Unico modulo que conoce los nombres de las variables de entorno. El resto del
sistema importa `settings` y nunca llama a os.getenv directamente.
"""
import os

from dotenv import load_dotenv

from app.core.logging import get_logger

logger = get_logger("core.config")

load_dotenv()


class Settings:
    """Valores de configuracion de la aplicacion."""

    APP_NAME: str = "FleetMind AI API"
    APP_DESCRIPTION: str = "Motor de Inteligencia Operativa"

    # --- IA generativa (OpenRouter) ---
    OPENROUTER_API_KEY: str | None = os.getenv("OPENROUTER_API_KEY")
    OPENROUTER_BASE_URL: str | None = os.getenv("OPENROUTER_BASE_URL")
    OPENROUTER_MODEL: str | None = os.getenv("OPENROUTER_MODEL")

    # --- Firebase ---
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase_credentials.json")

    # --- Modelos ML ---
    MODELO_FALLAS_PATH: str = os.getenv("MODELO_FALLAS_PATH", "modelo_fallas.joblib")
    MODELO_ANOMALIAS_PATH: str = os.getenv("MODELO_ANOMALIAS_PATH", "modelo_anomalias.joblib")

    # --- CORS ---
    CORS_ORIGINS: list[str] = (
        os.getenv("CORS_ORIGINS", "*").split(",") if os.getenv("CORS_ORIGINS") else ["*"]
    )

    @property
    def ia_habilitada(self) -> bool:
        return bool(self.OPENROUTER_API_KEY)

    def resumen(self) -> None:
        """Imprime el estado de la configuracion al arrancar, sin exponer secretos."""
        key = self.OPENROUTER_API_KEY
        logger.info("=" * 60)
        logger.info("CONFIGURACION FLEETMIND")
        logger.info("  OPENROUTER_BASE_URL: %s", self.OPENROUTER_BASE_URL or "NO DEFINIDO")
        logger.info("  OPENROUTER_API_KEY:  %s", ("***" + key[-8:]) if key else "NO DEFINIDO")
        logger.info("  OPENROUTER_MODEL:    %s", self.OPENROUTER_MODEL or "NO DEFINIDO")
        logger.info("  IA habilitada:       %s", self.ia_habilitada)
        logger.info("=" * 60)


settings = Settings()
