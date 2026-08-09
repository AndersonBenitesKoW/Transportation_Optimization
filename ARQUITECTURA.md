# Arquitectura — FleetMind

Documento de referencia de la estructura del proyecto. Describe **dónde va cada
cosa** y **por qué**, para que la organización se mantenga a medida que el
sistema crece.

---

## Visión general

```
Proyect_Transport_Front/
├── backend/     API FastAPI + Firestore + modelos ML
├── frontend/    SPA Angular 21 (standalone components)
└── documentacion_A4/
```

El frontend nunca habla directamente con la base de datos salvo en el caso ya
existente de mantenimiento preventivo (ver *Deuda técnica*). Todo lo demás pasa
por la API.

---

## Backend (FastAPI)

### Estructura

```
backend/
├── main.py                  Shim: reexporta `app` para `uvicorn main:app`
├── app/
│   ├── main.py              Crea la app, middlewares y registra routers
│   ├── core/                Infraestructura transversal
│   │   ├── config.py        Único lector de variables de entorno
│   │   ├── firebase.py      Conexión única a Firestore (Singleton)
│   │   └── logging.py       Logger centralizado + log_excepcion()
│   ├── api/routers/         Un router por dominio (solo coordinan)
│   ├── schemas/             Contratos Pydantic por dominio
│   ├── services/            Reglas de negocio (sin FastAPI ni Firestore)
│   ├── repositories/        Reservado para acceso a datos
│   ├── ml/                  Carga y ejecución de modelos joblib
│   └── integrations/        Adaptadores externos (OSRM, Nominatim, OpenRouter)
├── scripts/                 Simulador, entrenamiento, carga inicial
└── tests/
```

### Regla de dependencias

```
api/routers  →  services  →  integrations / ml / core
                    ↓
                 schemas
```

Un router **no** contiene reglas de negocio. Un service **no** conoce FastAPI.
`core` no depende de nada del proyecto salvo de sí mismo.

### Cómo agregar un endpoint

1. Define el contrato en `app/schemas/<dominio>.py`.
2. Si hay reglas de negocio, escríbelas en `app/services/<dominio>_service.py`.
3. Crea la ruta en `app/api/routers/<dominio>.py`.
4. Si el dominio es nuevo, añade el router a `ROUTERS` en
   `app/api/routers/__init__.py`. `app/main.py` no se toca.

### Manejo de errores

Todo bloque `except` registra el fallo con contexto y traceback mediante
`log_excepcion(logger, "contexto", e)`. **No se permiten `except: pass`.**
Las integraciones externas devuelven estados controlados (`None`, `(None, 0)`)
en lugar de propagar el fallo, para que un servicio caído no tumbe la API.

### Ejecución

```bash
cd backend
.\venv\Scripts\activate
py scripts\simulator.py        # simulador de telemetría
uvicorn main:app --reload      # equivalente: uvicorn app.main:app --reload
```

---

## Frontend (Angular)

### Estructura

```
frontend/src/app/
├── core/                    Singletons de toda la app
│   ├── api/                 Un cliente HTTP por dominio
│   │   ├── vehiculos.api.ts     conductores.api.ts
│   │   ├── viajes.api.ts        alertas.api.ts
│   │   ├── usuarios.api.ts      flota.api.ts
│   │   ├── kpis.api.ts          chat.api.ts
│   │   ├── mantenimiento.api.ts
│   │   └── http-error.util.ts   registrarError()
│   ├── guards/              adminGuard, conductorGuard
│   └── services/            AuthService, ThemeService
├── shared/
│   ├── models/              Fuente de verdad de los tipos de dominio
│   └── ui/                  Componentes reutilizables (IconComponent)
├── features/                Una carpeta por pantalla
│   ├── auth/login|register  home/       dashboard/
│   ├── unidades/            conductores/ alertas/
│   ├── viajes/              usuarios/    conductor/
└── layouts/                 admin/, publico/ (armazón de navegación)
```

### Reglas

- **`features/` no importa de otro `features/`.** Lo compartido sube a
  `shared/` o `core/`.
- Los modelos viven **solo** en `shared/models/`. No se declaran interfaces de
  dominio dentro de componentes ni de servicios.
- Cada pantalla se carga con `loadComponent` en `app.routes.ts`, por lo que
  agregar una feature no engorda el bundle inicial.

### Manejo de errores

Todo cliente HTTP encadena `registrarError('Servicio.metodo')`, que deja el
fallo en consola y lo vuelve a lanzar. El componente sigue decidiendo cómo
reaccionar; el error nunca queda silencioso.

### Ejecución

```bash
cd frontend
npm install
npx ng serve -o
```

---

## Modelos de usuario

Existen dos conceptos deliberadamente distintos:

| Tipo            | Significado                              |
|-----------------|------------------------------------------|
| `Usuario`       | Registro persistido en la base de datos  |
| `UsuarioSesion` | Perfil de la sesión autenticada en el navegador |

Antes ambos se llamaban `Usuario` en archivos distintos y con campos
divergentes, lo que hacía ambigua la fuente de verdad.

---

## Deuda técnica conocida

Pendientes identificados durante la reorganización, **no resueltos** aquí:

1. **Autenticación sin token.** `AuthService` guarda la sesión en
   `localStorage` y el backend no valida ninguna petición. Cualquiera puede
   editar `localStorage` para entrar como ADMIN, o llamar a la API
   directamente. Requiere emitir JWT en el login, validarlo con una dependencia
   de FastAPI y añadir un interceptor HTTP en Angular.
2. **Credenciales de Firebase en el historial de git.** El archivo se sacó del
   tracking, pero sigue presente en commits anteriores: la clave debe rotarse
   en Firebase Console.
3. **`mantenimiento.api.ts` escribe directo a Firestore** desde el navegador,
   saltándose la API. Debería moverse a endpoints del backend.
4. **`app/repositories/` está vacío.** El acceso a Firestore sigue dentro de los
   routers. Es el siguiente paso natural de la separación por capas.
5. **Cobertura de pruebas mínima** (2 specs en frontend, 1 script manual en
   backend). No hay pruebas de reglas de negocio.
