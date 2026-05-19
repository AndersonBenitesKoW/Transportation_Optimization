# ARQUITECTURA DE BASE DE DATOS - FleetMind AI

## RESUMEN EJECUTIVO

Sistema de gestión de flotas con IA predictiva usando Firebase Firestore (NoSQL).
Total de colecciones: 9 (7 implementadas, 2 faltantes)

---

## COLECCIONES IMPLEMENTADAS

### 1. conductores
**Propósito:** Información maestra de conductores
**Tipo:** Catálogo estático
**Documentos:** 5 (C-001 a C-005)

**Campos:**
- nombre: string
- licencia: string (A3B, A3C)
- telefono: string

**Relaciones:**
- 1:N con telemetria_flota (conductor_asignado)
- 1:N con historial_viajes
- 1:N con alertas

**Uso:**
- Asignación de conductores a vehículos
- Registro de responsables en incidentes
- Historial de viajes por conductor

---

### 2. vehiculos
**Propósito:** Información maestra de vehículos (datos estáticos)
**Tipo:** Catálogo maestro
**Documentos:** 5 (CAMION-001 a CAMION-005)

**Campos:**
- placa: string (P-123-ABC)
- modelo: string (Volvo FH16)
- anio: int64 (2020)
- marca: string (Volvo)
- tipo: string (Carga Pesada)
- capacidad_tanque_L: int64 (800)
- capacidad_carga_ton: int64 (25)
- kilometraje_total: int64 (85000)
- estado: string (Disponible, En Ruta, Taller)
- base_operativa: string (Lima Norte)
- fecha_adquisicion: timestamp
- fecha_registro: timestamp

**Relaciones:**
- 1:N con telemetria_flota
- 1:N con predicciones
- 1:N con alertas
- 1:N con historial_viajes
- N:1 con conductores

**Uso:**
- Información maestra del vehículo
- Gestión de flota
- Reportes por marca/modelo
- Programación de mantenimientos

**Conexión con requisitos:**
- RF01: Registrar datos de flota
- RF06: Gestión de usuarios (vehículos)

---

### 3. telemetria_flota
**Propósito:** Datos en tiempo real de cada vehículo
**Tipo:** Datos dinámicos (actualización cada 10 segundos)
**Documentos:** 5 (CAMION-001 a CAMION-005)

**Campos:**
- id_camion: string
- conductor_asignado: map {nombre, licencia, telefono}
- ubicacion: map {lat, lng}
- kilometraje: int64
- edad_motor_meses: int64
- combustible_actual_L: double
- capacidad_tanque_L: double
- nivel_combustible_pct: double
- estado_motor: string (Optimo, Alerta)
- temperatura_motor: double
- horas_conduccion: double
- consumo_instante: double
- destino: map {nombre, lat, lng}
- mision: string
- distancia_restante_km: double
- puntos_ruta: array de maps
- ultima_actualizacion: timestamp
- alerta_predictiva: string (calculado por IA)
- anomalia_combustible: boolean (calculado por IA)

**Relaciones:**
- N:1 con vehiculos (id_camion)
- Genera → predicciones (cuando IA detecta riesgo)
- Genera → incidentes_flota (cuando hay anomalía)
- Genera → alertas (cuando hay evento crítico)

**Actualización:**
- Simulador (simulator.py) cada 10 segundos
- Backend lee y agrega predicciones de IA

**Uso:**
- Monitoreo en tiempo real
- Input para modelos de IA
- Dashboard operativo
- Tracking GPS

**Conexión con requisitos:**
- RF01: Registrar datos de flota
- RF02: Predicción de fallas (input)
- RF03: Detección de anomalías (input)
- RF04: Optimizar rutas

---

### 4. predicciones
**Propósito:** Historial de predicciones generadas por IA
**Tipo:** Registro histórico de IA
**Documentos:** Variable (1 por predicción)

**Campos:**
- vehiculo_ref: string (CAMION-002)
- tipo_prediccion: string (Falla Mecánica, Anomalía Combustible)
- score_falla: double (0.85 = 85% probabilidad)
- prediccion: int64 (0=No falla, 1=Falla)
- nivel_riesgo: string (Normal, Aviso, Crítico)
- datos_entrada: map {
    kilometraje: int64,
    edad_motor_meses: int64,
    horas_conduccion: double,
    temperatura_motor: double
  }
- componente_predicho: string (Motor, Frenos, Alternador)
- descripcion: string
- accion_recomendada: string
- dias_estimados_falla: int64
- estado: string (Pendiente, En Revisión, Confirmada, Falsa Alarma)
- fecha_prediccion: timestamp
- ocurrio_falla: boolean (null inicialmente)
- fecha_falla_real: timestamp (null inicialmente)
- precision_prediccion: double (null inicialmente)

**Relaciones:**
- N:1 con vehiculos (vehiculo_ref)
- Genera → alertas (cuando nivel_riesgo = Crítico)

**Flujo de creación:**
1. Backend lee telemetria_flota/CAMION-002
2. Extrae datos: kilometraje, edad_motor_meses, horas_conduccion, temperatura_motor
3. IA (modelo_fallas.joblib) hace predicción
4. Si prediccion = 1, guarda en predicciones con vehiculo_ref y datos_entrada

**Uso:**
- Auditoría de predicciones de IA
- Validación de precisión del modelo
- Mejora continua del modelo
- Justificación de mantenimientos

**Conexión con requisitos:**
- RF02: Predicción de fallas
- RF03: Detección de anomalías

**Modelos de IA:**
- modelo_fallas.joblib (Random Forest)
  - Input: kilometraje, edad_motor_meses, horas_conduccion, temperatura_motor
  - Output: 0 (No falla) o 1 (Falla en 15 días)
  
- modelo_anomalias.joblib (Isolation Forest)
  - Input: consumo_por_minuto, velocidad
  - Output: 1 (Normal) o -1 (Anomalía)

---

### 5. alertas
**Propósito:** Notificaciones activas que requieren acción inmediata
**Tipo:** Sistema de notificaciones en tiempo real
**Documentos:** Variable (activas y resueltas)

**Campos:**
- vehiculo_ref: string (CAMION-003)
- conductor_ref: string (C-003)
- tipo: string (Falla Crítica, Consumo Alto, Desvío, Combustible Bajo)
- categoria: string (Operacional, Seguridad, Mantenimiento, Eficiencia)
- titulo: string
- descripcion: string
- nivel: string (Info, Aviso, Crítico, Emergencia)
- prioridad: int64 (1=Máxima, 5=Mínima)
- ubicacion: map {lat, lng}
- estado: string (Activa, En Proceso, Resuelta, Descartada)
- leida: boolean
- accion_requerida: string
- accion_tomada: string (null inicialmente)
- responsable: string (null inicialmente)
- origen: string (IA Predictiva, Sensor, Manual, Sistema)
- prediccion_ref: string (referencia a predicciones/)
- fecha_creacion: timestamp
- fecha_lectura: timestamp (null inicialmente)
- fecha_resolucion: timestamp (null inicialmente)
- notificado_a: array de strings (emails)
- canal_notificacion: array de strings (email, push, sms)

**Relaciones:**
- N:1 con vehiculos (vehiculo_ref)
- N:1 con conductores (conductor_ref)
- N:1 con predicciones (prediccion_ref)

**Flujo de creación:**
1. IA genera predicción con nivel_riesgo = Crítico
2. Sistema crea alerta automáticamente
3. Notifica a admin@fleetmind.com
4. Admin lee y toma acción
5. Alerta se marca como Resuelta

**Diferencia con incidentes_flota:**
- alertas: Proactiva, requiere acción, notifica, tiene prioridad
- incidentes_flota: Reactiva, solo registra, no notifica, histórico

**Uso:**
- Notificaciones push/email
- Dashboard de alertas activas
- Seguimiento de acciones
- Priorización de emergencias

**Conexión con requisitos:**
- RF05: Generar alertas
- RNF01: Respuesta en menos de 3 segundos

---

### 6. incidentes_flota
**Propósito:** Registro histórico de eventos que ya ocurrieron
**Tipo:** Auditoría y análisis histórico
**Documentos:** Variable (acumulativo)

**Campos:**
- fecha_hora: timestamp
- id_camion: string (CAMION-003)
- conductor: map {nombre, licencia, telefono}
- tipo_alerta: string (Anomalía de Combustible, Exceso Velocidad, Desvío)
- descripcion: string
- ubicacion_incidente: map {lat, lng}
- estado: string (Abierto, Cerrado)

**Relaciones:**
- N:1 con vehiculos (id_camion)
- N:1 con conductores

**Flujo de creación:**
1. Simulador detecta anomalía (ej: consumo 15x normal)
2. Registra incidente automáticamente
3. Se guarda para análisis posterior

**Uso:**
- Auditoría de eventos
- Análisis de patrones
- Reportes históricos
- Validación de predicciones de IA

**Conexión con requisitos:**
- RF03: Detección de anomalías
- RF05: Generar alertas (registro)

---

### 7. historial_viajes
**Propósito:** Registro de viajes completados
**Tipo:** Histórico para análisis y KPIs
**Documentos:** Variable (1 por viaje completado)

**Campos:**
- id_camion: string
- conductor: string (nombre)
- punto_partida: map {lat, lng}
- punto_llegada: map {lat, lng}
- destino_nombre: string
- distancia_recorrida_km: double
- combustible_total_consumido_L: double
- duracion_total: string (HH:MM:SS)
- incidentes_registrados: int64
- fecha_viaje: timestamp

**Campos FALTANTES (a implementar):**
- combustible_estimado_L: double
- eficiencia_pct: double
- desviacion_L: double
- es_eficiente: boolean

**Relaciones:**
- N:1 con vehiculos (id_camion)
- N:1 con conductores

**Flujo de creación:**
1. Simulador inicia viaje, guarda stats iniciales
2. Vehículo llega a destino
3. Calcula métricas del viaje
4. Guarda en historial_viajes

**Uso:**
- KPI de eficiencia operativa
- Análisis de consumo real vs estimado
- Reportes de conductores
- Auditoría de operaciones

**Conexión con requisitos:**
- RF08: Visualización y reportes
- Análisis de eficiencia

---

## COLECCIONES FALTANTES (ALTA PRIORIDAD)

### 8. mantenimientos (FALTA IMPLEMENTAR)
**Propósito:** Historial de mantenimientos preventivos y correctivos
**Prioridad:** MEDIA

**Campos:**
- vehiculo_ref: string
- tipo: string (Preventivo, Correctivo, Emergencia)
- categoria: string (Motor, Frenos, Transmisión, Eléctrico)
- descripcion: string
- componentes_reemplazados: array de strings
- costo_repuestos: double
- costo_mano_obra: double
- costo_total: double
- taller: string
- mecanico: string
- orden_trabajo: string
- kilometraje_actual: int64
- proximo_mantenimiento_km: int64
- fue_predictivo: boolean
- prediccion_ref: string
- alerta_ref: string
- fecha_programada: timestamp
- fecha_inicio: timestamp
- fecha_fin: timestamp
- duracion_horas: double
- estado: string (Programado, En Proceso, Completado, Cancelado)
- aprobado_por: string
- observaciones: string

**Relaciones:**
- N:1 con vehiculos
- N:1 con predicciones (si fue_predictivo = true)
- N:1 con alertas

**Uso:**
- Historial de mantenimientos
- Validación de predicciones de IA
- Cálculo de costos operativos
- Planificación de mantenimientos

**Conexión con requisitos:**
- RF02: Predicción de fallas (validación)
- Gestión de mantenimiento preventivo

---

### 9. rutas (FALTA IMPLEMENTAR)
**Propósito:** Catálogo de rutas predefinidas y optimizadas
**Prioridad:** MEDIA

**Campos:**
- nombre: string (Lima - Arequipa)
- codigo: string (LIM-AQP-01)
- origen: map {nombre, lat, lng}
- destino: map {nombre, lat, lng}
- paradas: array de maps {nombre, lat, lng}
- distancia_km: double
- duracion_estimada_horas: double
- consumo_estimado_L: double
- tipo_vehiculo: array de strings
- peso_maximo_ton: int64
- restricciones_horarias: string
- puntos_ruta_optimizada: array de maps
- veces_usada: int64
- promedio_consumo_real_L: double
- eficiencia_promedio_pct: double
- activa: boolean
- fecha_creacion: timestamp
- ultima_actualizacion: timestamp

**Relaciones:**
- N:N con vehiculos (tipo_vehiculo)

**Uso:**
- Planificación de viajes
- Optimización de rutas recurrentes
- Estimaciones precisas de consumo
- Comparación de eficiencia

**Conexión con requisitos:**
- RF04: Optimizar rutas
- Planificación logística

---

## FLUJO DE DATOS CON IA

### Flujo 1: Predicción de Fallas

1. simulator.py actualiza telemetria_flota/CAMION-002 cada 10 segundos
   - kilometraje: 210500
   - edad_motor_meses: 72
   - temperatura_motor: 110.5
   - horas_conduccion: 12.5

2. Frontend solicita GET /api/flota

3. Backend (main.py) lee telemetria_flota

4. Para cada vehículo:
   a. Extrae datos: kilometraje, edad_motor_meses, horas_conduccion, temperatura_motor
   b. Crea DataFrame para IA
   c. modelo_fallas.predict() → resultado: 0 o 1
   d. Si resultado = 1:
      - Guarda en predicciones con vehiculo_ref y datos_entrada
      - Crea alerta con nivel Crítico
      - Notifica a admin

5. Frontend muestra alerta_predictiva en dashboard

### Flujo 2: Detección de Anomalías

1. simulator.py detecta consumo anormal (15x normal)
   - consumo_instante: 5.25 L en 10 segundos

2. Backend lee telemetria_flota

3. Para cada vehículo:
   a. Extrae consumo_instante
   b. modelo_anomalias.predict() → resultado: 1 (normal) o -1 (anomalía)
   c. Si resultado = -1:
      - Marca anomalia_combustible = true
      - Registra en incidentes_flota
      - Puede crear alerta si es crítico

4. Frontend muestra anomalia_combustible en dashboard

---

## CONEXIÓN CON REQUISITOS FUNCIONALES

RF01: Registrar datos de flota
- telemetria_flota (datos en tiempo real)
- vehiculos (datos maestros)

RF02: Predicción de fallas
- predicciones (historial de predicciones)
- telemetria_flota (input para IA)
- modelo_fallas.joblib

RF03: Detección de anomalías
- incidentes_flota (registro de anomalías)
- telemetria_flota (input para IA)
- modelo_anomalias.joblib

RF04: Optimizar rutas
- rutas (catálogo de rutas)
- telemetria_flota (puntos_ruta)

RF05: Generar alertas
- alertas (notificaciones activas)
- predicciones (origen de alertas)

RF06: Gestión de usuarios
- conductores (usuarios conductores)
- vehiculos (asignación)

RF07: Chatbot
- (No implementado en BD, usa IA generativa)

RF08: Visualización
- historial_viajes (reportes)
- predicciones (análisis de IA)
- incidentes_flota (auditoría)

---

## CONEXIÓN CON REQUISITOS NO FUNCIONALES

RNF01: Rendimiento (< 3 segundos)
- Índices en fecha_hora, vehiculo_ref
- Consultas optimizadas

RNF02: Seguridad
- Firebase Authentication
- Reglas de seguridad en Firestore

RNF03: Disponibilidad (24/7)
- Firebase Cloud (99.95% uptime)

RNF04: Usabilidad
- Dashboard con datos de telemetria_flota
- Alertas en tiempo real

RNF05: Escalabilidad
- Firestore escala automáticamente
- Arquitectura NoSQL

---

## RELACIONES ENTRE COLECCIONES

vehiculos (1) ←→ (N) telemetria_flota
vehiculos (1) ←→ (N) predicciones
vehiculos (1) ←→ (N) alertas
vehiculos (1) ←→ (N) historial_viajes
vehiculos (1) ←→ (N) incidentes_flota
vehiculos (N) ←→ (1) conductores

predicciones (1) ←→ (N) alertas
predicciones (N) ←→ (1) vehiculos

alertas (N) ←→ (1) vehiculos
alertas (N) ←→ (1) conductores
alertas (N) ←→ (1) predicciones

telemetria_flota → genera → predicciones (cuando IA detecta riesgo)
telemetria_flota → genera → incidentes_flota (cuando hay anomalía)
predicciones → genera → alertas (cuando nivel_riesgo = Crítico)

---

## MODELOS DE IA

### modelo_fallas.joblib
**Algoritmo:** Random Forest Classifier
**Entrenamiento:** dataset_historico_flota.csv (2100 registros)
**Input:**
- kilometraje (int)
- edad_motor_meses (int)
- horas_conduccion (float)
- temperatura_motor (float)
**Output:**
- 0 = No falla en 15 días
- 1 = Falla en 15 días
**Precisión:** ~87-92%

### modelo_anomalias.joblib
**Algoritmo:** Isolation Forest
**Entrenamiento:** Datos sintéticos (2000 normales + 100 anómalos)
**Input:**
- consumo_por_minuto (float)
- velocidad (float)
**Output:**
- 1 = Normal
- -1 = Anomalía (posible robo/fuga)
**Contaminación:** 5%

---

## ÍNDICES RECOMENDADOS EN FIREBASE

telemetria_flota:
- ultima_actualizacion (DESC)

predicciones:
- vehiculo_ref + fecha_prediccion (DESC)
- nivel_riesgo + estado

alertas:
- estado + prioridad
- vehiculo_ref + fecha_creacion (DESC)
- leida + nivel

incidentes_flota:
- fecha_hora (DESC)
- id_camion + fecha_hora (DESC)

historial_viajes:
- fecha_viaje (DESC)
- id_camion + fecha_viaje (DESC)

---

## TAMAÑO ESTIMADO DE DATOS

conductores: 5 docs × 0.5 KB = 2.5 KB
vehiculos: 5 docs × 1 KB = 5 KB
telemetria_flota: 5 docs × 2 KB = 10 KB (actualización constante)
predicciones: ~50 docs/mes × 1.5 KB = 75 KB/mes
alertas: ~30 docs/mes × 1 KB = 30 KB/mes
incidentes_flota: ~100 docs/mes × 0.8 KB = 80 KB/mes
historial_viajes: ~150 docs/mes × 1 KB = 150 KB/mes

Total estimado: ~350 KB/mes (muy bajo para Firebase)

---

## PRÓXIMOS PASOS

1. Implementar colección mantenimientos
2. Implementar colección rutas
3. Agregar campos de eficiencia en historial_viajes:
   - combustible_estimado_L
   - eficiencia_pct
   - desviacion_L
4. Crear endpoint /api/prediccion para guardar predicciones
5. Crear endpoint /api/alertas para gestionar alertas
6. Implementar WebSockets para tiempo real (RF06)
7. Crear dashboard de KPIs usando historial_viajes
8. Implementar sistema de notificaciones (email/push)

---

## COMANDOS ÚTILES

Inicializar todas las colecciones:
```bash
cd backend
python inicializar_colecciones.py
```

Entrenar modelos de IA:
```bash
python entrenar_modelo.py
python entrenar_anomalias.py
```

Iniciar simulador:
```bash
python simulator.py
```

Iniciar backend:
```bash
uvicorn main:app --reload
```

---

FIN DEL DOCUMENTO
