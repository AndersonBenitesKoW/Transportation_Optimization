"""Conexion unica a Firebase Firestore (patron Singleton).

Es el unico punto del backend que inicializa Firebase. Cualquier capa que
necesite acceso a datos debe pedir el cliente con `get_db()`.
"""
import firebase_admin
from firebase_admin import credentials, firestore

from app.core.config import settings
from app.core.logging import get_logger, log_excepcion

logger = get_logger("core.firebase")


class Database:
    """Envuelve la conexion a Firestore garantizando una sola instancia."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._initialize_firebase()
        return cls._instance

    def _initialize_firebase(self) -> None:
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                firebase_admin.initialize_app(cred)

            self.db = firestore.client()
            logger.info("Conexion a Firebase Firestore establecida exitosamente.")
        except Exception as e:
            log_excepcion(logger, "No se pudo inicializar Firebase Firestore", e)
            raise

    def get_db(self):
        return self.db


db_manager = Database()


def get_db():
    """Devuelve el cliente de Firestore listo para usar."""
    return db_manager.get_db()
