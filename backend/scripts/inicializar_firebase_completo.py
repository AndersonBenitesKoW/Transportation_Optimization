# Permite ejecutar este script desde cualquier ubicacion resolviendo los
# imports de pp.* contra la raiz del backend.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
"""
Script para inicializar y poblar todas las colecciones de Firebase
para el proyecto FleetMind AI - Semana 1
"""

from app.core.firebase import db_manager
from datetime import datetime, timedelta
import random

db = db_manager.get_db()

print("🚀 Iniciando configuración completa de Firebase para FleetMind AI...\n")

# ============================================================================
# 1. COLECCIÓN: conductores
# ============================================================================
print("📋 1. Poblando colección 'conductores'...")
conductores_data = [
    {
        "id_conductor": "C-001",
        "nombre": "Juan Pérez",
        "licencia": "A3B",
        "telefono": "987654321",
        "email": "juan.perez@ransa.com",
        "fecha_contratacion": datetime(2020, 3, 15),
        "estado": "Activo",
        "experiencia_anios": 8,
        "calificacion": 4.7
    },
    {
        "id_conductor": "C-002",
        "nombre": "Carlos Mendoza",
        "licencia": "A3C",
        "telefono": "912345678",
        "email": "carlos.mendoza@ransa.com",
        "fecha_contratacion": datetime(2018, 7, 22),
        "estado": "Activo",
        "experiencia_anios": 12,
        "calificacion": 4.5
    },
    {
        "id_conductor": "C-003",
        "nombre": "Luis Ramírez",
        "licencia": "A3B",
        "telefono": "998877665",
        "email": "luis.ramirez@ransa.com",
        "fecha_contratacion": datetime(2021, 1, 10),
        "estado": "Activo",
        "experiencia_anios": 5,
        "calificacion": 4.8
    },
    {
        "id_conductor": "C-004",
        "nombre": "Miguel Torres",
        "licencia": "A3C",
        "telefono": "955443322",
        "email": "miguel.torres@ransa.com",
        "fecha_contratacion": datetime(2019, 11, 5),
        "estado": "Activo",
        "experiencia_anios": 10,
        "calificacion": 4.6
    },
    {
        "id_conductor": "C-005",
        "nombre": "Jorge Vargas",
        "licencia": "A3B",
        "telefono": "911223344",
        "email": "jorge.vargas@ransa.com",
        "fecha_contratacion": datetime(2022, 6, 18),
        "estado": "Activo",
        "experiencia_anios": 3,
        "calificacion": 4.9
    }
]

for conductor in conductores_data:
    doc_ref = db.collection('conductores').document(conductor['id_conductor'])
    doc_ref.set(conductor)
    print(f"   ✅ Conductor {conductor['id_conductor']} - {conductor['nombre']}")

# ============================================================================
# 2. COLECCIÓN: vehiculos
# ============================================================================
print("\n🚛 2. Poblando colección 'vehiculos'...")
vehiculos_data = [
    {
        "id_vehiculo": "CAMION-001",
        "placa": "ABC-123",
        "marca": "Volvo",
        "modelo": "FH16",
        "anio": 2020,
        "capacidad_tanque_L": 800.0,
        "capacidad_carga_ton": 28.0,
        "kilometraje_actual": 85000.0,
        "edad_motor_meses": 24,
        "estado": "En ruta",
        "conductor_asignado": "C-001",
        "fecha_adquisicion": datetime(2020, 5, 10),
        "ultimo_mantenimiento": datetime(2024, 4, 15),
        "proximo_mantenimiento_km": 90000.0
    },
    {
        "id_vehiculo": "CAMION-002",
        "placa": "DEF-456",
        "marca": "Scania",
        "modelo": "R450",
        "anio": 2018,
        "capacidad_tanque_L": 600.0,
        "capacidad_carga_ton": 25.0,
        "kilometraje_actual": 210500.0,
        "edad_motor_meses": 72,
        "estado": "En ruta",
        "conductor_asignado": "C-002",
        "fecha_adquisicion": datetime(2018, 8, 20),
        "ultimo_mantenimiento": datetime(2024, 3, 10),
        "proximo_mantenimiento_km": 215000.0
    },
    {
        "id_vehiculo": "CAMION-003",
        "placa": "GHI-789",
        "marca": "Mercedes-Benz",
        "modelo": "Actros",
        "anio": 2022,
        "capacidad_tanque_L": 500.0,
        "capacidad_carga_ton": 30.0,
        "kilometraje_actual": 45300.0,
        "edad_motor_meses": 12,
        "estado": "Disponible",
        "conductor_asignado": "C-003",
        "fecha_adquisicion": datetime(2022, 1, 15),
        "ultimo_mantenimiento": datetime(2024, 5, 1),
        "proximo_mantenimiento_km": 50000.0
    },
    {
        "id_vehiculo": "CAMION-004",
        "placa": "JKL-012",
        "marca": "Volvo",
        "modelo": "FH12",
        "anio": 2019,
        "capacidad_tanque_L": 800.0,
        "capacidad_carga_ton": 27.0,
        "kilometraje_actual": 98200.0,
        "edad_motor_meses": 36,
        "estado": "En ruta",
        "conductor_asignado": "C-004",
        "fecha_adquisicion": datetime(2019, 3, 25),
        "ultimo_mantenimiento": datetime(2024, 4, 20),
        "proximo_mantenimiento_km": 100000.0
    },
    {
        "id_vehiculo": "CAMION-005",
        "placa": "MNO-345",
        "marca": "Scania",
        "modelo": "P320",
        "anio": 2023,
        "capacidad_tanque_L": 400.0,
        "capacidad_carga_ton": 20.0,
        "kilometraje_actual": 15000.0,
        "edad_motor_meses": 6,
        "estado": "Taller",
        "conductor_asignado": "C-005",
        "fecha_adquisicion": datetime(2023, 11, 10),
        "ultimo_mantenimiento": datetime(2024, 5, 10),
        "proximo_mantenimiento_km": 20000.0
    }
]

for vehiculo in vehiculos_data:
    doc_ref = db.collection('vehiculos').document(vehiculo['id_vehiculo'])
    doc_ref.set(vehiculo)
    print(f"   ✅ Vehículo {vehiculo['id_vehiculo']} - {vehiculo['placa']}")

# ============================================================================
# 3. COLECCIÓN: usuarios (NUEVA)
# ============================================================================
print("\n👤 3. Creando colección 'usuarios'...")
usuarios_data = [
    {
        "uid": "admin001",
        "email": "admin@fleetmind.com",
        "nombre": "Administrador Principal",
        "rol": "ADMIN",
        "empresa": "Ransa",
        "telefono": "999888777",
        "fecha_registro": datetime.now(),
        "activo": True,
        "permisos": ["ver_flota", "gestionar_vehiculos", "gestionar_conductores", "ver_reportes", "gestionar_alertas"]
    },
    {
        "uid": "conductor001",
        "email": "juan.perez@ransa.com",
        "nombre": "Juan Pérez",
        "rol": "CONDUCTOR",
        "empresa": "Ransa",
        "telefono": "987654321",
        "id_conductor": "C-001",
        "fecha_registro": datetime(2020, 3, 15),
        "activo": True,
        "permisos": ["ver_telemetria_propia", "usar_chatbot"]
    },
    {
        "uid": "conductor002",
        "email": "carlos.mendoza@ransa.com",
        "nombre": "Carlos Mendoza",
        "rol": "CONDUCTOR",
        "empresa": "Ransa",
        "telefono": "912345678",
        "id_conductor": "C-002",
        "fecha_registro": datetime(2018, 7, 22),
        "activo": True,
        "permisos": ["ver_telemetria_propia", "usar_chatbot"]
    }
]

for usuario in usuarios_data:
    doc_ref = db.collection('usuarios').document(usuario['uid'])
    doc_ref.set(usuario)
    print(f"   ✅ Usuario {usuario['email']} - Rol: {usuario['rol']}")

# ============================================================================
# 4. COLECCIÓN: mantenimientos (NUEVA)
# ============================================================================
print("\n🔧 4. Creando colección 'mantenimientos'...")
mantenimientos_data = [
    {
        "id_vehiculo": "CAMION-002",
        "tipo": "Preventivo",
        "descripcion": "Revisión de motor y cambio de aceite",
        "fecha_programada": datetime.now() + timedelta(days=7),
        "kilometraje_programado": 215000.0,
        "estado": "Programado",
        "prioridad": "Alta",
        "costo_estimado": 1500.0,
        "taller": "Taller Norte Trujillo",
        "mecanico_asignado": "Roberto Díaz",
        "fecha_creacion": datetime.now()
    },
    {
        "id_vehiculo": "CAMION-005",
        "tipo": "Correctivo",
        "descripcion": "Reparación de sistema de frenos",
        "fecha_programada": datetime.now() + timedelta(days=2),
        "kilometraje_programado": 15000.0,
        "estado": "En Proceso",
        "prioridad": "Crítica",
        "costo_estimado": 2800.0,
        "taller": "Taller Sur Trujillo",
        "mecanico_asignado": "Fernando López",
        "fecha_creacion": datetime.now() - timedelta(days=1),
        "fecha_inicio": datetime.now()
    },
    {
        "id_vehiculo": "CAMION-001",
        "tipo": "Preventivo",
        "descripcion": "Inspección general de 90,000 km",
        "fecha_programada": datetime.now() + timedelta(days=15),
        "kilometraje_programado": 90000.0,
        "estado": "Programado",
        "prioridad": "Media",
        "costo_estimado": 1200.0,
        "taller": "Taller Norte Trujillo",
        "mecanico_asignado": "Roberto Díaz",
        "fecha_creacion": datetime.now()
    }
]

for i, mantenimiento in enumerate(mantenimientos_data):
    doc_ref = db.collection('mantenimientos').add(mantenimiento)
    print(f"   ✅ Mantenimiento {i+1} - {mantenimiento['id_vehiculo']} - {mantenimiento['tipo']}")

# ============================================================================
# 5. COLECCIÓN: rutas (NUEVA)
# ============================================================================
print("\n🗺️ 5. Creando colección 'rutas'...")
rutas_data = [
    {
        "id_vehiculo": "CAMION-001",
        "nombre_ruta": "Trujillo - Almacén Laredo",
        "origen": {"nombre": "Base Central", "lat": -8.1159, "lng": -79.0299},
        "destino": {"nombre": "Almacén Laredo", "lat": -8.0822, "lng": -79.0144},
        "distancia_km": 5.2,
        "duracion_estimada_min": 18,
        "consumo_estimado_L": 1.82,
        "estado": "Completada",
        "fecha_inicio": datetime.now() - timedelta(hours=2),
        "fecha_fin": datetime.now() - timedelta(hours=1, minutes=42),
        "consumo_real_L": 1.95,
        "eficiencia_pct": 93.3
    },
    {
        "id_vehiculo": "CAMION-004",
        "nombre_ruta": "Trujillo - Puerto Salaverry",
        "origen": {"nombre": "Base Central", "lat": -8.1159, "lng": -79.0299},
        "destino": {"nombre": "Puerto Salaverry", "lat": -8.2255, "lng": -78.9811},
        "distancia_km": 18.5,
        "duracion_estimada_min": 35,
        "consumo_estimado_L": 6.48,
        "estado": "En Progreso",
        "fecha_inicio": datetime.now() - timedelta(minutes=20),
        "consumo_parcial_L": 2.1,
        "progreso_pct": 32.4
    }
]

for i, ruta in enumerate(rutas_data):
    doc_ref = db.collection('rutas').add(ruta)
    print(f"   ✅ Ruta {i+1} - {ruta['nombre_ruta']} - Estado: {ruta['estado']}")

# ============================================================================
# 6. COLECCIÓN: alertas (Poblar con ejemplos)
# ============================================================================
print("\n⚠️ 6. Poblando colección 'alertas'...")
alertas_data = [
    {
        "id_vehiculo": "CAMION-002",
        "tipo": "Mantenimiento Preventivo",
        "prioridad": "Alta",
        "titulo": "Mantenimiento de 215,000 km próximo",
        "descripcion": "El vehículo CAMION-002 está próximo a alcanzar los 215,000 km. Se recomienda programar mantenimiento preventivo.",
        "estado": "Pendiente",
        "fecha_creacion": datetime.now() - timedelta(days=2),
        "fecha_limite": datetime.now() + timedelta(days=5),
        "origen": "Sistema IA",
        "requiere_accion": True
    },
    {
        "id_vehiculo": "CAMION-003",
        "tipo": "Anomalía de Combustible",
        "prioridad": "Crítica",
        "titulo": "Consumo irregular detectado",
        "descripcion": "Se detectó un consumo de combustible 15x superior al normal. Posible fuga o robo.",
        "estado": "Pendiente",
        "fecha_creacion": datetime.now() - timedelta(hours=3),
        "fecha_limite": datetime.now() + timedelta(hours=12),
        "origen": "Modelo Anomalías",
        "requiere_accion": True,
        "ubicacion": {"lat": -8.1259, "lng": -79.0399}
    },
    {
        "id_vehiculo": "CAMION-001",
        "tipo": "Combustible Bajo",
        "prioridad": "Media",
        "titulo": "Nivel de combustible bajo (18%)",
        "descripcion": "El vehículo CAMION-001 tiene un nivel de combustible del 18%. Se recomienda reabastecimiento.",
        "estado": "Resuelta",
        "fecha_creacion": datetime.now() - timedelta(days=1),
        "fecha_resolucion": datetime.now() - timedelta(hours=20),
        "origen": "Telemetría",
        "requiere_accion": False,
        "resuelto_por": "admin@fleetmind.com",
        "notas_resolucion": "Vehículo reabastecido en estación Laredo"
    }
]

for i, alerta in enumerate(alertas_data):
    doc_ref = db.collection('alertas').add(alerta)
    print(f"   ✅ Alerta {i+1} - {alerta['tipo']} - {alerta['id_vehiculo']}")

# ============================================================================
# 7. COLECCIÓN: predicciones (Poblar con ejemplos)
# ============================================================================
print("\n🧠 7. Poblando colección 'predicciones'...")
predicciones_data = [
    {
        "id_vehiculo": "CAMION-002",
        "tipo_prediccion": "Falla Mecánica",
        "resultado": "Peligro de Falla",
        "probabilidad": 0.87,
        "confianza": "Alta",
        "datos_entrada": {
            "kilometraje": 210500.0,
            "edad_motor_meses": 72,
            "horas_conduccion": 12.5,
            "temperatura_motor": 108.0
        },
        "recomendacion": "Programar mantenimiento preventivo urgente. Revisar sistema de refrigeración.",
        "fecha_prediccion": datetime.now() - timedelta(hours=6),
        "modelo_usado": "modelo_fallas.joblib",
        "version_modelo": "1.0"
    },
    {
        "id_vehiculo": "CAMION-003",
        "tipo_prediccion": "Anomalía Combustible",
        "resultado": "Anomalía Detectada",
        "probabilidad": 0.95,
        "confianza": "Muy Alta",
        "datos_entrada": {
            "consumo_por_minuto": 0.65,
            "velocidad": 12.0
        },
        "recomendacion": "Inspeccionar tanque de combustible. Posible fuga o robo.",
        "fecha_prediccion": datetime.now() - timedelta(hours=3),
        "modelo_usado": "modelo_anomalias.joblib",
        "version_modelo": "1.0"
    },
    {
        "id_vehiculo": "CAMION-001",
        "tipo_prediccion": "Falla Mecánica",
        "resultado": "Operación Segura",
        "probabilidad": 0.12,
        "confianza": "Alta",
        "datos_entrada": {
            "kilometraje": 85000.0,
            "edad_motor_meses": 24,
            "horas_conduccion": 4.2,
            "temperatura_motor": 88.0
        },
        "recomendacion": "Vehículo en condiciones óptimas. Continuar operación normal.",
        "fecha_prediccion": datetime.now() - timedelta(hours=1),
        "modelo_usado": "modelo_fallas.joblib",
        "version_modelo": "1.0"
    }
]

for i, prediccion in enumerate(predicciones_data):
    doc_ref = db.collection('predicciones').add(prediccion)
    print(f"   ✅ Predicción {i+1} - {prediccion['tipo_prediccion']} - {prediccion['id_vehiculo']}")

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print("\n" + "="*70)
print("✅ INICIALIZACIÓN COMPLETA DE FIREBASE")
print("="*70)
print("\n📊 RESUMEN DE COLECCIONES:")
print(f"   ✅ conductores: {len(conductores_data)} documentos")
print(f"   ✅ vehiculos: {len(vehiculos_data)} documentos")
print(f"   ✅ usuarios: {len(usuarios_data)} documentos")
print(f"   ✅ mantenimientos: {len(mantenimientos_data)} documentos")
print(f"   ✅ rutas: {len(rutas_data)} documentos")
print(f"   ✅ alertas: {len(alertas_data)} documentos")
print(f"   ✅ predicciones: {len(predicciones_data)} documentos")
print("\n📝 COLECCIONES EXISTENTES (gestionadas por simulator.py):")
print("   ✅ telemetria_flota - Actualizada en tiempo real")
print("   ✅ incidentes_flota - Registros automáticos")
print("   ✅ historial_viajes - Viajes completados")
print("\n🎯 BASE DE DATOS LISTA PARA SEMANA 1")
print("="*70)
