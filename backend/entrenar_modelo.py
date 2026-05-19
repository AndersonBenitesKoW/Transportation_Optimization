import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

def entrenar_ia():
    print("Cargando el dataset histórico...")
    # 1. Leer los datos
    df = pd.read_csv("dataset_historico_flota.csv")

    # 2. Separar las características (X) y lo que queremos predecir (y)
    X = df[["kilometraje", "edad_motor_meses", "horas_conduccion", "temperatura_motor"]]
    y = df["falla_15_dias"]

    # 3. Dividir los datos: 80% para que la IA estudie, 20% para tomarle un "examen"
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Entrenando el modelo Random Forest (Bosque Aleatorio)...")
    # 4. Crear el modelo y entrenarlo
    modelo = RandomForestClassifier(n_estimators=100, random_state=42)
    modelo.fit(X_train, y_train)

    # 5. Tomar el examen (Evaluar con el 20% de datos que no ha visto)
    predicciones = modelo.predict(X_test)
    precision = accuracy_score(y_test, predicciones)
    print(f"✅ ¡Examen aprobado! Precisión del modelo: {precision * 100:.2f}%")

    # 6. Guardar el modelo ya entrenado (exportamos el cerebro)
    joblib.dump(modelo, "modelo_fallas.joblib")
    print("🧠 Cerebro predictivo exportado exitosamente como 'modelo_fallas.joblib'")

if __name__ == "__main__":
    entrenar_ia()