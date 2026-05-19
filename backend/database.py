import firebase_admin
from firebase_admin import credentials, firestore

class Database:
    _instance = None

    def __new__(cls):
        # Implementación del Patrón Singleton
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._initialize_firebase()
        return cls._instance

    def _initialize_firebase(self):
        # Verifica si la app de Firebase ya está inicializada para no duplicarla
        if not firebase_admin._apps:
            # Ruta al archivo JSON de credenciales que descargaste
            cred = credentials.Certificate("firebase_credentials.json")
            firebase_admin.initialize_app(cred)
        
        # Conectamos con Firestore
        self.db = firestore.client()
        print("Conexión a Firebase Firestore establecida exitosamente.")

    def get_db(self):
        return self.db

# Instanciamos la clase para poder importarla en otros archivos
db_manager = Database()