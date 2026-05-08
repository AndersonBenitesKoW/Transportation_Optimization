import pandas as pd
import random
from sklearn.ensemble import IsolationForest
import joblib

def entrenar_detector_anomalias():
    print("Generando datos de consumo realistas para FleetMind AI...")
    datos = []
    
    # 2000 Registros NORMALES (Consumo basado en 0.35 L/km)
    for _ in range(2000):
        # En 10 seg a 45km/h el consumo base es ~0.04L. 
        # Ponemos un rango de 0.03 a 0.08 por tráfico/aceleración.
        consumo_ciclo = random.uniform(0.03, 0.08) 
        velocidad = random.uniform(30, 60)
        datos.append({"consumo_por_minuto": consumo_ciclo, "velocidad": velocidad})
        
    # 100 Registros ANÓMALOS (Robo o fuga de combustible)
    for _ in range(100):
        # Un robo o fuga consume drásticamente más en el mismo tiempo
        consumo_ciclo = random.uniform(0.4, 0.8) 
        velocidad = random.uniform(0, 15) # Casi siempre ocurre cuando están lentos o parados
        datos.append({"consumo_por_minuto": consumo_ciclo, "velocidad": velocidad})
        
    df = pd.DataFrame(datos)
    # Ajustamos la contaminación al 5% para ser sensibles a cambios sutiles
    modelo = IsolationForest(contamination=0.05, random_state=42)
    modelo.fit(df[["consumo_por_minuto", "velocidad"]])
    
    joblib.dump(modelo, "modelo_anomalias.joblib")
    print("✅ IA de Anomalías sincronizada con la física de litros del simulador.")

if __name__ == "__main__":
    entrenar_detector_anomalias()