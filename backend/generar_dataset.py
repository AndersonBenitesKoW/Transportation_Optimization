import pandas as pd
import random

def generar_dataset_historico(num_registros=5000):
    print(f"Generando {num_registros} registros históricos mejorados...")
    
    datos = []
    for _ in range(num_registros):
        kilometraje = random.randint(10000, 300000)
        edad_motor_meses = random.randint(6, 120)
        horas_conduccion = random.uniform(1.0, 14.0)
        temperatura_motor = random.uniform(80.0, 115.0) 
        
        # --- NUEVA LÓGICA MÁS DETERMINISTA ---
        falla = 0
        puntos_criticos = 0
        
        if kilometraje > 150000: puntos_criticos += 1
        if edad_motor_meses > 60: puntos_criticos += 1
        if temperatura_motor > 102.0: puntos_criticos += 2 # La temperatura alta es fatal
        if horas_conduccion > 10.0: puntos_criticos += 1
        
        # Si acumula 3 o más puntos críticos, es casi seguro que falla
        if puntos_criticos >= 3:
            falla = 1
        elif puntos_criticos == 2:
            # Zona de duda, un poco de aleatoriedad (50/50)
            falla = 1 if random.random() > 0.5 else 0
            
        datos.append({
            "kilometraje": kilometraje,
            "edad_motor_meses": edad_motor_meses,
            "horas_conduccion": round(horas_conduccion, 1),
            "temperatura_motor": round(temperatura_motor, 1),
            "falla_15_dias": falla
        })
        
    df = pd.DataFrame(datos)
    df.to_csv("dataset_historico_flota.csv", index=False)
    print("✅ Dataset mejorado generado exitosamente.")

if __name__ == "__main__":
    generar_dataset_historico()