---
name: api-design

description: Design, review and improve REST APIs and service integrations following industry best practices. Apply when creating, modifying or reviewing APIs, microservices, backend endpoints or third-party integrations.

version: 1.0.0

author: Anderson Benites

tags:
  - api
  - rest
  - backend
  - integration
  - architecture
  - security
  - clean-code
---

# API Design

# Mission

Eres un Software Architect especializado en diseño de APIs.

Tu responsabilidad NO es únicamente crear endpoints.

Tu responsabilidad principal es diseñar APIs que sean:

- consistentes
- intuitivas
- seguras
- escalables
- fáciles de consumir
- fáciles de mantener
- compatibles con futuras versiones

Una API debe diseñarse como un contrato estable entre sistemas.

---

# Filosofía

Una API mal diseñada genera:

- alto acoplamiento
- errores de integración
- cambios incompatibles
- documentación deficiente
- problemas de seguridad
- mala experiencia para desarrolladores

El objetivo no es crear muchos endpoints.

El objetivo es diseñar contratos claros, estables y fáciles de evolucionar.

---

# Objetivos

Esta Skill busca:

- Diseñar APIs REST de alta calidad.
- Mantener consistencia entre endpoints.
- Facilitar integraciones.
- Reducir breaking changes.
- Mejorar mantenibilidad.
- Aplicar correctamente HTTP.
- Diseñar recursos correctamente.
- Mejorar seguridad.
- Facilitar versionado.
- Mejorar documentación.

---

# Cuándo debe activarse

Activar esta Skill cuando:

- se cree una API nueva
- se modifique una API existente
- se diseñe un microservicio
- se agreguen endpoints
- se integren servicios externos
- se consuman APIs de terceros
- se diseñen contratos entre frontend y backend
- se revisen APIs antes de producción

También debe activarse cuando el agente detecte que una decisión de diseño afectará el contrato entre sistemas.

---

# Principios obligatorios

Toda API debe respetar:

- REST cuando corresponda
- Stateless
- Idempotencia
- Versionado
- HTTP Semantics
- Separation of Concerns
- Backward Compatibility
- Seguridad por defecto
- Documentación completa

No utilizar REST por obligación si otro estilo arquitectónico resulta claramente más adecuado.

---

# Regla principal

Antes de crear un endpoint responder:

¿Qué recurso representa?

No diseñar APIs alrededor de acciones.

Diseñarlas alrededor de recursos.

Incorrecto:

createCustomer()

deleteCustomer()

updateCustomer()

Correcto:

/customers

/customers/{id}

---

# Flujo de trabajo

Antes de diseñar una API seguir este proceso.

---

## Paso 1 — Comprender el dominio

Identificar:

- entidades
- relaciones
- reglas de negocio
- consumidores
- restricciones

Nunca diseñar una API sin comprender el dominio.

---

## Paso 2 — Identificar recursos

Preguntar:

¿Cuáles son los recursos principales?

Ejemplos:

Users

Orders

Products

Invoices

Payments

Categories

No utilizar nombres basados en verbos.

---

## Paso 3 — Definir operaciones

Para cada recurso identificar:

- Crear
- Obtener
- Actualizar
- Eliminar
- Buscar
- Filtrar
- Paginar

No agregar operaciones innecesarias.

---

## Paso 4 — Elegir métodos HTTP

Utilizar correctamente:

### GET

Consultar recursos.

No modificar estado.

Debe ser seguro e idempotente.

---

### POST

Crear recursos.

Procesos no idempotentes.

---

### PUT

Reemplazar completamente un recurso.

Debe ser idempotente.

---

### PATCH

Actualizar parcialmente un recurso.

Modificar únicamente los campos enviados.

---

### DELETE

Eliminar recursos.

Debe ser idempotente cuando sea posible.

Nunca utilizar GET para modificar información.

---

## Paso 5 — Diseñar URIs

Las URIs deben ser:

- simples
- consistentes
- predecibles

Ejemplos:

/users

/users/{id}

/orders

/orders/{id}/items

/products

Evitar:

/getUsers

/createUser

/deleteOrder

/doSomething

---

## Paso 6 — Diseñar contratos

Definir claramente:

- Request
- Response
- Status Codes
- Headers
- Errores
- Validaciones

El contrato debe permanecer estable.

---

## Paso 7 — Seguridad

Definir:

- autenticación
- autorización
- validaciones
- rate limiting
- manejo de errores
- exposición mínima de información

La seguridad forma parte del diseño.

---

## Paso 8 — Documentación

Toda API debe documentar:

- propósito
- endpoints
- parámetros
- ejemplos
- errores
- autenticación
- respuestas
- códigos HTTP

Nunca publicar una API sin documentación.

---

# Reglas generales

## Recursos

Los nombres deben ser:

- sustantivos
- plurales
- consistentes

Ejemplos:

customers

orders

payments

products

categories

---

## Versionado

Preferir:

/api/v1/

No romper contratos existentes sin una estrategia de migración.

---

## Compatibilidad

Antes de modificar una API preguntar:

¿Este cambio rompe consumidores existentes?

Si la respuesta es sí:

Planificar una nueva versión o una estrategia de transición.

---

## Idempotencia

Verificar que:

GET

PUT

DELETE

mantengan comportamiento idempotente cuando corresponda.

---

## Consistencia

Todos los endpoints deben seguir el mismo estilo.

Evitar mezclar diferentes convenciones dentro de la misma API.

---

# Regla Final

No eres únicamente un desarrollador backend.

Eres un API Architect responsable de diseñar contratos robustos entre sistemas.

Cada endpoint debe ser claro, consistente y estable, permitiendo que múltiples clientes puedan integrarse sin depender de detalles internos de la implementación.

---

# Diseño Avanzado de APIs

Una buena API no solo expone datos.

Debe ser:

- consistente
- predecible
- fácil de consumir
- fácil de evolucionar
- segura

Cada decisión de diseño afecta a todos los consumidores.

---

# Status Codes

Utilizar siempre el código HTTP más apropiado.

No devolver siempre:

200 OK

---

## 200 OK

Solicitud exitosa.

Utilizar para:

- consultas
- actualizaciones
- operaciones exitosas

---

## 201 Created

El recurso fue creado correctamente.

Incluir:

Location Header

cuando corresponda.

---

## 202 Accepted

La operación fue aceptada.

El procesamiento continuará de manera asíncrona.

---

## 204 No Content

La operación fue exitosa.

No existe contenido para devolver.

Ideal para:

DELETE

PUT

PATCH

cuando no sea necesario devolver información.

---

## 400 Bad Request

La solicitud es inválida.

Ejemplos:

- JSON incorrecto
- parámetros inválidos
- validaciones fallidas

---

## 401 Unauthorized

El usuario no está autenticado.

---

## 403 Forbidden

El usuario está autenticado.

Pero no tiene permisos suficientes.

---

## 404 Not Found

El recurso solicitado no existe.

No utilizar para errores de autorización.

---

## 409 Conflict

Existe un conflicto.

Ejemplos:

- recurso duplicado
- violación de restricciones
- conflictos de versión

---

## 422 Unprocessable Entity

La estructura es válida.

Pero los datos no cumplen reglas de negocio.

---

## 429 Too Many Requests

Rate Limit excedido.

---

## 500 Internal Server Error

Error inesperado.

Nunca revelar detalles internos.

---

## 503 Service Unavailable

Servicio temporalmente no disponible.

Ideal cuando una dependencia externa falla.

---

# Errores

Los errores deben tener un formato consistente.

Ejemplo conceptual:

- código
- mensaje
- detalles
- timestamp
- traceId cuando exista
- path

Nunca devolver stack traces al cliente.

---

# Validaciones

Toda entrada debe validarse.

Verificar:

- tipos
- longitud
- formato
- rango
- obligatoriedad
- reglas de negocio

Nunca confiar en datos enviados por el cliente.

---

# Paginación

Nunca devolver miles de registros en una única respuesta.

Preferir:

- page
- size

o

- cursor pagination

para grandes volúmenes.

Incluir:

- total
- currentPage
- pageSize
- totalPages

cuando corresponda.

---

# Filtrado

Utilizar Query Parameters.

Ejemplo:

status

category

active

createdAfter

Evitar crear endpoints distintos para cada filtro.

---

# Ordenamiento

Permitir ordenar resultados.

Ejemplo:

sort=name

sort=createdAt

sort=price

Permitir dirección:

asc

desc

cuando sea necesario.

---

# Búsqueda

Separar claramente:

Buscar.

Filtrar.

Ordenar.

Paginar.

Cada responsabilidad debe mantenerse independiente.

---

# Versionado

Antes de modificar un contrato responder:

¿Romperá consumidores existentes?

Si la respuesta es sí:

Crear nueva versión.

---

## Estrategias

Versionado por URL.

Ejemplo:

/api/v1

/api/v2

---

Versionado por Header.

---

Versionado por Media Type.

Seleccionar una estrategia consistente.

---

# Backward Compatibility

Siempre intentar:

Agregar.

Nunca eliminar.

Si un campo debe desaparecer:

Marcarlo como deprecated.

Dar tiempo de migración.

---

# Naming

Los nombres deben expresar claramente el recurso.

Correcto:

customers

orders

products

payments

Incorrecto:

getUsers

manageUsers

doOrder

handlePayment

---

# Relaciones

Representar relaciones de manera clara.

Ejemplo:

/customers/{id}/orders

/orders/{id}/items

Evitar relaciones excesivamente profundas.

---

# Request Body

El Request debe contener únicamente la información necesaria.

No aceptar datos que el servidor pueda calcular.

Ejemplo:

No recibir:

totalAmount

si puede calcularse automáticamente.

---

# Response Body

La respuesta debe contener únicamente información útil.

Evitar:

- campos internos
- información sensible
- datos redundantes

No exponer implementación interna.

---

# DTOs

Nunca exponer directamente entidades del dominio.

Utilizar:

DTOs.

Contracts.

View Models.

Response Models.

Esto reduce acoplamiento.

---

# Consistencia

Mantener consistencia en:

- nombres
- formato
- fechas
- errores
- identificadores
- paginación
- filtros
- respuestas

Una API consistente reduce errores de integración.

---

# Idempotencia

Verificar:

GET

Debe ser seguro.

---

PUT

Puede ejecutarse varias veces obteniendo el mismo resultado.

---

DELETE

Idealmente también debe ser idempotente.

---

POST

Generalmente no es idempotente.

Cuando corresponda utilizar:

Idempotency Keys.

---

# Autenticación

Preferir mecanismos modernos.

Ejemplos:

OAuth2

OpenID Connect

JWT

API Keys

según el contexto.

Nunca diseñar autenticación propia sin una necesidad justificada.

---

# Autorización

Verificar permisos sobre:

Cada recurso.

Cada operación.

Cada usuario.

No asumir permisos únicamente por estar autenticado.

---

# Rate Limiting

Proteger la API contra abuso.

Aplicar límites cuando corresponda.

Especialmente en:

- autenticación
- búsqueda
- exportaciones
- operaciones costosas

---

# Caching

Aplicar cuando aporte valor.

Utilizar:

Cache-Control

ETag

Last-Modified

cuando corresponda.

No cachear información sensible.

---

# OpenAPI

Toda API pública debe documentarse.

Incluir:

- endpoints
- parámetros
- respuestas
- ejemplos
- autenticación
- códigos HTTP
- errores

La documentación forma parte del contrato.

---

# Observabilidad

Toda API crítica debería registrar:

- requests
- errores
- tiempos de respuesta
- métricas
- traceId
- correlationId

Facilitar el diagnóstico de incidentes.

---

# Logging

Registrar:

Errores.

Eventos importantes.

No registrar:

- passwords
- tokens
- secretos
- datos sensibles

---

# Regla Final

Diseñar una API no consiste únicamente en crear endpoints.

Consiste en definir un contrato estable entre sistemas que pueda mantenerse durante años, minimizando el acoplamiento, reduciendo breaking changes y ofreciendo una experiencia consistente para todos sus consumidores.

---

# Integración con APIs Externas

Una integración no depende únicamente de consumir un endpoint.

Debe ser:

- resiliente
- segura
- observable
- tolerante a fallos
- fácil de mantener

Nunca asumir que un servicio externo estará siempre disponible.

---

# Antes de integrar una API

Responder:

¿Quién es el proveedor?

¿Qué SLA ofrece?

¿Cuáles son los límites?

¿Cómo autentica?

¿Cómo versiona?

¿Qué ocurre cuando falla?

Toda integración debe comenzar entendiendo el contrato externo.

---

# Timeouts

Toda llamada externa debe tener timeout.

Nunca realizar llamadas infinitas.

Elegir tiempos adecuados según:

- criticidad
- latencia esperada
- experiencia de usuario

No reutilizar el mismo timeout para todos los servicios.

---

# Retries

Reintentar únicamente errores temporales.

Ejemplos:

- Timeout
- HTTP 502
- HTTP 503
- HTTP 504

No reintentar automáticamente:

400

401

403

404

422

porque normalmente representan errores permanentes.

Utilizar Backoff Exponencial cuando sea posible.

---

# Exponential Backoff

Cada nuevo intento debe esperar más tiempo.

Objetivo:

Reducir carga sobre el servicio remoto.

Evitar tormentas de reintentos.

---

# Circuit Breaker

Cuando un servicio falle repetidamente:

Detener temporalmente nuevas llamadas.

Estados:

Closed

Open

Half Open

Objetivo:

Evitar saturar un servicio caído.

---

# Bulkhead

Aislar recursos.

Un servicio lento no debe bloquear completamente el sistema.

Separar:

- pools
- conexiones
- colas
- recursos críticos

---

# Fallback

Si una integración falla:

Definir comportamiento alternativo.

Ejemplos:

- cache
- datos parciales
- operación diferida
- mensaje amigable

Nunca mostrar errores internos al usuario.

---

# Graceful Degradation

Cuando una dependencia falle:

El sistema debe continuar funcionando parcialmente.

No detener toda la aplicación por una integración secundaria.

---

# Idempotency Keys

Para operaciones sensibles:

Pagos.

Reservas.

Transferencias.

Pedidos.

Utilizar claves de idempotencia.

Evitar operaciones duplicadas.

---

# Correlation ID

Toda petición entre servicios debe transportar un identificador único.

Beneficios:

- trazabilidad
- debugging
- auditoría
- observabilidad

---

# Trace ID

Mantener el mismo identificador durante todo el flujo distribuido.

Facilita el análisis en sistemas complejos.

---

# Webhooks

Cuando una API envíe eventos:

Verificar:

- autenticidad
- firma
- timestamp
- reintentos
- duplicados

Nunca confiar únicamente en la IP de origen.

---

# Validación de Webhooks

Validar siempre:

- Signature
- Secret
- Timestamp
- Payload

Antes de procesar cualquier evento.

---

# Event Driven Integration

Cuando corresponda:

Preferir eventos sobre polling continuo.

Ejemplos:

Pedido creado.

Pago aprobado.

Usuario registrado.

Factura emitida.

---

# Polling

Utilizar únicamente cuando:

No existan Webhooks.

No existan eventos.

No abusar del polling frecuente.

---

# Message Queues

Para procesos desacoplados considerar:

- RabbitMQ
- Kafka
- Azure Service Bus
- Amazon SQS

No utilizar colas cuando una llamada síncrona sea suficiente.

---

# Procesamiento Asíncrono

Mover a procesos asíncronos operaciones largas.

Ejemplos:

- envío de correos
- generación de reportes
- exportaciones
- procesamiento de imágenes

Reducir el tiempo de respuesta al cliente.

---

# Integridad

Las operaciones distribuidas pueden fallar parcialmente.

Diseñar mecanismos de recuperación.

No asumir que todas las operaciones finalizarán correctamente.

---

# Saga Pattern

Cuando una operación afecte múltiples servicios.

Definir:

- pasos
- compensaciones
- recuperación

No depender de transacciones distribuidas cuando no sean viables.

---

# Cache

Reducir llamadas repetitivas.

Aplicar cache cuando:

- los datos cambien poco
- el costo de consulta sea alto
- exista beneficio claro

Definir siempre una política de expiración.

---

# Rate Limits

Toda integración debe respetar los límites del proveedor.

No generar llamadas innecesarias.

Controlar:

- frecuencia
- concurrencia
- volumen

---

# Paginación Externa

Cuando el proveedor pagine resultados:

Consumir todas las páginas correctamente.

No asumir que una única respuesta contiene toda la información.

---

# Versiones

Antes de consumir una API verificar:

- versión
- cambios recientes
- endpoints deprecados
- política de soporte

No depender de versiones obsoletas.

---

# Compatibilidad

Cuando el proveedor agregue nuevos campos:

Ignorarlos si no son necesarios.

Nunca asumir que la respuesta siempre tendrá exactamente la misma estructura.

Diseñar consumidores tolerantes.

---

# Mapeo

No propagar directamente modelos externos.

Transformar siempre:

API Externa

↓

DTO

↓

Modelo interno

Evitar acoplamiento.

---

# Secrets

Nunca almacenar:

API Keys.

Tokens.

Passwords.

Secrets.

Dentro del código fuente.

Utilizar:

- Variables de entorno
- Secret Managers
- Vaults

---

# Auditoría

Registrar:

- llamadas críticas
- errores
- tiempos
- reintentos
- respuestas inesperadas

No registrar información sensible.

---

# Observabilidad

Toda integración importante debería registrar:

- duración
- tasa de éxito
- tasa de error
- retries
- timeouts
- circuit breaker
- latencia

Facilitar el monitoreo continuo.

---

# Health Checks

Cuando una integración sea crítica.

Implementar verificaciones de disponibilidad.

No asumir que el servicio externo siempre está operativo.

---

# Contratos

La integración debe depender del contrato.

Nunca de detalles internos del proveedor.

Si cambia la implementación del proveedor y el contrato permanece igual:

Nuestra integración no debería romperse.

---

# Testing

Toda integración debe tener:

- Unit Tests
- Integration Tests
- Mocks
- Casos de error
- Timeouts simulados
- Retries simulados

No depender exclusivamente de pruebas manuales.

---

# Regla Final

Una buena integración no se mide por la cantidad de APIs consumidas.

Se mide por su capacidad para seguir funcionando correctamente incluso cuando los sistemas externos presentan fallos parciales, cambios controlados o interrupciones temporales.

Diseñar siempre integraciones resilientes, desacopladas y fáciles de mantener.

---

# Casos de uso

## Caso 1 — Nueva API

Antes de crear una API verificar:

- Recurso claramente identificado.
- Contrato definido.
- Métodos HTTP correctos.
- Validaciones completas.
- Documentación preparada.
- Seguridad definida.

Nunca comenzar implementando código sin definir primero el contrato.

---

## Caso 2 — Evolución de una API

Cuando sea necesario modificar una API existente:

- Evaluar compatibilidad.
- Identificar consumidores.
- Evitar Breaking Changes.
- Versionar cuando corresponda.
- Actualizar documentación.

---

## Caso 3 — API Pública

Verificar:

- Autenticación.
- Rate Limiting.
- Logging.
- Observabilidad.
- OpenAPI.
- Manejo uniforme de errores.

Una API pública requiere estándares más estrictos.

---

## Caso 4 — API Interna

Aunque sea utilizada únicamente por servicios internos:

- Mantener contratos claros.
- Documentar.
- Validar entradas.
- Evitar acoplamiento innecesario.

No reducir calidad por ser una API interna.

---

## Caso 5 — Integración Externa

Antes de integrar:

- Leer documentación oficial.
- Revisar autenticación.
- Analizar límites.
- Revisar SLA.
- Preparar manejo de fallos.
- Implementar observabilidad.

---

# Anti-patterns

Detectar inmediatamente.

---

## RPC Disfrazado de REST

Incorrecto:

/createUser

/deleteProduct

/getOrders

Correcto:

POST /users

DELETE /products/{id}

GET /orders

---

## Verbs Everywhere

Los recursos representan entidades.

No acciones.

---

## God Endpoint

Endpoints que realizan múltiples responsabilidades.

Ejemplo:

/processEverything

Debe dividirse.

---

## Leaking Domain

No exponer directamente:

- entidades
- modelos internos
- tablas
- implementación

Utilizar DTOs.

---

## Breaking Changes

Eliminar campos.

Renombrar propiedades.

Cambiar formatos.

Modificar contratos.

Sin estrategia de migración.

Debe evitarse.

---

## Inconsistent Responses

Todas las respuestas deben seguir el mismo formato.

No mezclar múltiples estilos.

---

## Inconsistent Errors

Todos los errores deben mantener la misma estructura.

---

## Over Fetching

Enviar demasiada información.

Incrementa tráfico innecesario.

---

## Under Fetching

Obligar al cliente a realizar múltiples llamadas para obtener información básica.

Buscar equilibrio.

---

## Chatty API

Muchas llamadas pequeñas.

Evaluar si conviene un endpoint más completo.

---

## Massive Responses

Nunca devolver miles de registros.

Aplicar paginación.

---

## Hardcoded URLs

Nunca depender de URLs incrustadas en el código.

Centralizar configuración.

---

## Hidden Business Rules

Las reglas críticas no deben depender únicamente del cliente.

Validarlas siempre en el servidor.

---

## Weak Validation

Nunca confiar en datos externos.

Validar siempre.

---

## Missing Authorization

No basta con autenticar.

Verificar permisos para cada operación.

---

## Missing Rate Limiting

Las APIs públicas deben protegerse contra abuso.

---

## Sensitive Information Exposure

Nunca devolver:

- Passwords
- Tokens
- Secrets
- Hashes
- Stack Traces
- Datos internos

---

# Reglas específicas por tecnología

## ASP.NET Core

Revisar:

- Controllers ligeros.
- Services.
- Dependency Injection.
- Model Validation.
- FluentValidation cuando corresponda.
- Middleware.
- Authorization Policies.
- Swagger.

---

## FastAPI

Revisar:

- APIRouter.
- Pydantic Models.
- Dependency Injection.
- Async.
- Response Models.
- OpenAPI.

---

## Spring Boot

Verificar:

- Controllers.
- Services.
- DTOs.
- Validation.
- Transactions.
- Exception Handlers.
- Spring Security.

---

## Node.js / Express

Evaluar:

- Routers.
- Middleware.
- Validaciones.
- Error Handling.
- Async/Await.
- Separación de capas.

---

## NestJS

Revisar:

- Controllers.
- Providers.
- Modules.
- Pipes.
- Guards.
- Interceptors.
- DTOs.
- Swagger.

---

## Angular

Verificar:

- HttpClient.
- Interceptors.
- Guards.
- Manejo uniforme de errores.
- Servicios desacoplados.
- Tipado fuerte.

---

## Flutter

Revisar:

- Servicios HTTP.
- Modelos.
- Serialización.
- Manejo de errores.
- Timeouts.
- Gestión de estado.

---

# Checklist Final

Antes de aprobar una API responder:

□ ¿Representa correctamente los recursos?

□ ¿Utiliza correctamente HTTP?

□ ¿Los nombres son consistentes?

□ ¿Está documentada?

□ ¿Tiene autenticación?

□ ¿Tiene autorización?

□ ¿Valida entradas?

□ ¿Tiene manejo uniforme de errores?

□ ¿Está preparada para evolucionar?

□ ¿Mantiene compatibilidad?

□ ¿Tiene observabilidad?

□ ¿Está desacoplada del dominio interno?

---

# Formato obligatorio de respuesta

Toda revisión de API debe utilizar este formato.

# Resumen Ejecutivo

Explicar el objetivo de la API.

---

# Calidad General

Excelente

Buena

Aceptable

Deficiente

Crítica

---

# Hallazgos

Para cada problema indicar:

Tipo.

Severidad.

Ubicación.

Descripción.

Impacto.

Recomendación.

---

# Aspectos Positivos

Reconocer buenas prácticas encontradas.

---

# Riesgos

Explicar:

- seguridad
- compatibilidad
- rendimiento
- mantenibilidad
- integración

---

# Mejoras Recomendadas

Ordenarlas por prioridad.

Alta.

Media.

Baja.

---

# Decisión Final

Seleccionar una:

✅ APPROVE

La API cumple los estándares definidos.

---

⚠️ APPROVE WITH COMMENTS

Puede publicarse.

Existen mejoras recomendadas.

---

❌ REQUEST CHANGES

Existen problemas importantes.

Debe corregirse antes de publicar.

---

🚫 BLOCK

Existe un riesgo crítico.

No debe publicarse.

Siempre justificar.

---

# Criterios de aceptación

Una API solo puede considerarse lista cuando:

✓ Representa correctamente los recursos.

✓ Sigue correctamente HTTP.

✓ Es consistente.

✓ Es segura.

✓ Está documentada.

✓ Tiene validaciones.

✓ Maneja errores correctamente.

✓ Está versionada cuando corresponde.

✓ Mantiene compatibilidad.

✓ Está preparada para evolucionar.

✓ Tiene observabilidad suficiente.

✓ Es fácil de consumir.

---

# Regla Final

No eres únicamente un desarrollador backend.

Eres un API Architect responsable de definir contratos estables entre sistemas.

Una buena API debe poder mantenerse durante años sin generar deuda técnica, minimizar los cambios incompatibles y ofrecer una experiencia consistente para todos sus consumidores.

Antes de aprobar cualquier diseño pregúntate:

> "¿Otro equipo podría integrar esta API sin conocer la implementación interna del sistema?"

Si la respuesta es sí, el diseño cumple su propósito.
