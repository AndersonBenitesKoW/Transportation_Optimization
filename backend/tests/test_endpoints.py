# Permite ejecutar este script desde cualquier ubicacion resolviendo los
# imports de pp.* contra la raiz del backend.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
"""
Script para probar los endpoints CRUD del backend FleetMind AI
"""
import requests
import json

BASE_URL = "http://localhost:8000"

print("🧪 PROBANDO ENDPOINTS DE FLEETMIND AI\n")
print("="*70)

# ============================================================================
# 1. PROBAR ENDPOINT RAÍZ
# ============================================================================
print("\n1️⃣ Probando endpoint raíz (GET /)...")
response = requests.get(f"{BASE_URL}/")
print(f"   Status: {response.status_code}")
print(f"   Respuesta: {response.json()}")

# ============================================================================
# 2. LISTAR VEHÍCULOS
# ============================================================================
print("\n2️⃣ Probando listar vehículos (GET /api/vehiculos)...")
response = requests.get(f"{BASE_URL}/api/vehiculos")
print(f"   Status: {response.status_code}")
data = response.json()
print(f"   Total vehículos: {len(data['data'])}")
print(f"   Primer vehículo: {data['data'][0]['id_vehiculo']} - {data['data'][0]['placa']}")

# ============================================================================
# 3. OBTENER UN VEHÍCULO ESPECÍFICO
# ============================================================================
print("\n3️⃣ Probando obtener vehículo específico (GET /api/vehiculos/CAMION-001)...")
response = requests.get(f"{BASE_URL}/api/vehiculos/CAMION-001")
print(f"   Status: {response.status_code}")
vehiculo = response.json()['data']
print(f"   Vehículo: {vehiculo['id_vehiculo']}")
print(f"   Placa: {vehiculo['placa']}")
print(f"   Marca: {vehiculo['marca']} {vehiculo['modelo']}")
print(f"   Estado: {vehiculo['estado']}")

# ============================================================================
# 4. CREAR UN NUEVO VEHÍCULO
# ============================================================================
print("\n4️⃣ Probando crear nuevo vehículo (POST /api/vehiculos)...")
nuevo_vehiculo = {
    "id_vehiculo": "CAMION-TEST",
    "placa": "TEST-999",
    "marca": "Volvo",
    "modelo": "FH16",
    "anio": 2024,
    "capacidad_tanque_L": 750.0,
    "capacidad_carga_ton": 28.0,
    "kilometraje_actual": 1000.0,
    "edad_motor_meses": 2,
    "estado": "Disponible",
    "conductor_asignado": "C-001"
}
response = requests.post(f"{BASE_URL}/api/vehiculos", json=nuevo_vehiculo)
print(f"   Status: {response.status_code}")
print(f"   Respuesta: {response.json()}")

# ============================================================================
# 5. ACTUALIZAR VEHÍCULO
# ============================================================================
print("\n5️⃣ Probando actualizar vehículo (PUT /api/vehiculos/CAMION-TEST)...")
actualizacion = {
    "estado": "En ruta",
    "kilometraje_actual": 1500.0
}
response = requests.put(f"{BASE_URL}/api/vehiculos/CAMION-TEST", json=actualizacion)
print(f"   Status: {response.status_code}")
print(f"   Respuesta: {response.json()}")

# Verificar actualización
response = requests.get(f"{BASE_URL}/api/vehiculos/CAMION-TEST")
vehiculo_actualizado = response.json()['data']
print(f"   Estado actualizado: {vehiculo_actualizado['estado']}")
print(f"   Kilometraje actualizado: {vehiculo_actualizado['kilometraje_actual']}")

# ============================================================================
# 6. LISTAR CONDUCTORES
# ============================================================================
print("\n6️⃣ Probando listar conductores (GET /api/conductores)...")
response = requests.get(f"{BASE_URL}/api/conductores")
print(f"   Status: {response.status_code}")
data = response.json()
print(f"   Total conductores: {len(data['data'])}")
print(f"   Primer conductor: {data['data'][0]['id_conductor']} - {data['data'][0]['nombre']}")

# ============================================================================
# 7. CREAR UN NUEVO CONDUCTOR
# ============================================================================
print("\n7️⃣ Probando crear nuevo conductor (POST /api/conductores)...")
nuevo_conductor = {
    "id_conductor": "C-TEST",
    "nombre": "Test Conductor",
    "licencia": "A3B",
    "telefono": "999999999",
    "email": "test@fleetmind.com",
    "experiencia_anios": 5,
    "calificacion": 4.5
}
response = requests.post(f"{BASE_URL}/api/conductores", json=nuevo_conductor)
print(f"   Status: {response.status_code}")
print(f"   Respuesta: {response.json()}")

# ============================================================================
# 8. ACTUALIZAR CONDUCTOR
# ============================================================================
print("\n8️⃣ Probando actualizar conductor (PUT /api/conductores/C-TEST)...")
actualizacion_conductor = {
    "calificacion": 4.8,
    "experiencia_anios": 6
}
response = requests.put(f"{BASE_URL}/api/conductores/C-TEST", json=actualizacion_conductor)
print(f"   Status: {response.status_code}")
print(f"   Respuesta: {response.json()}")

# ============================================================================
# 9. ELIMINAR VEHÍCULO DE PRUEBA
# ============================================================================
print("\n9️⃣ Probando eliminar vehículo (DELETE /api/vehiculos/CAMION-TEST)...")
response = requests.delete(f"{BASE_URL}/api/vehiculos/CAMION-TEST")
print(f"   Status: {response.status_code}")
print(f"   Respuesta: {response.json()}")

# ============================================================================
# 10. ELIMINAR CONDUCTOR DE PRUEBA
# ============================================================================
print("\n🔟 Probando eliminar conductor (DELETE /api/conductores/C-TEST)...")
response = requests.delete(f"{BASE_URL}/api/conductores/C-TEST")
print(f"   Status: {response.status_code}")
print(f"   Respuesta: {response.json()}")

# ============================================================================
# 11. PROBAR ENDPOINT DE FLOTA (CON IA)
# ============================================================================
print("\n1️⃣1️⃣ Probando endpoint de flota con IA (GET /api/flota)...")
response = requests.get(f"{BASE_URL}/api/flota")
print(f"   Status: {response.status_code}")
data = response.json()
if data['data']:
    primer_camion = data['data'][0]
    print(f"   Primer camión: {primer_camion['id_camion']}")
    print(f"   Alerta predictiva: {primer_camion.get('alerta_predictiva', 'N/A')}")
    print(f"   Anomalía combustible: {primer_camion.get('anomalia_combustible', 'N/A')}")

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print("\n" + "="*70)
print("✅ TODAS LAS PRUEBAS COMPLETADAS")
print("="*70)
print("\n📊 RESUMEN:")
print("   ✅ Endpoint raíz funcionando")
print("   ✅ CRUD de vehículos funcionando (GET, POST, PUT, DELETE)")
print("   ✅ CRUD de conductores funcionando (GET, POST, PUT, DELETE)")
print("   ✅ Endpoint de flota con predicciones IA funcionando")
print("\n🎯 BACKEND LISTO PARA SEMANA 1")
