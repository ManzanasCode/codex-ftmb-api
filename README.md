# API Call Detector Service

Microservicio backend con Node.js, TypeScript, Express y Playwright para detectar y extraer llamadas REST (`xhr` y `fetch`) realizadas por una web.

## Objetivo

Recibe una URL, abre la página con Chromium headless, escucha respuestas de red y devuelve únicamente llamadas de tipo API con metadatos útiles.

## Stack

- Node.js (LTS)
- TypeScript (strict mode)
- Express
- Playwright (Chromium)
- Swagger (`swagger-jsdoc` + `swagger-ui-express`)

## Características

- Endpoint `POST /detect`
- Endpoint `GET /health`
- Endpoint `GET /app-info`
- Swagger UI en `GET /docs`
- Dedupe de llamadas por URL
- Filtro opcional por términos en `filters` (arreglo de strings)
- Parseo JSON seguro (si no se puede parsear, `data: null`)
- Timeout de detección por página: `10s`
- Reuso de navegador con patrón singleton
- Middlewares de validación, timeout y manejo global de errores
- CORS habilitado
- Logging por consola

## Arquitectura

```text
src/
  app.ts                     # Configuración de Express + middlewares + rutas
  index.ts                   # Arranque del servidor y shutdown graceful
  config/
    env.ts                   # Configuración central (puerto, timeouts)
  controllers/
    detection.controller.ts  # HTTP in/out de /detect
    health.controller.ts     # HTTP in/out de /health
  docs/
    swagger.ts               # Configuración OpenAPI/Swagger
  middlewares/
    error.middleware.ts      # NotFound + error handler global
    logging.middleware.ts    # Logging de requests
    timeout.middleware.ts    # Timeout por request HTTP
    validation.middleware.ts # Validación de body.url
  routes/
    detection.routes.ts      # Definición de /detect + docs del endpoint
    health.routes.ts         # Definición de /health
    index.ts                 # Agregador de rutas
  services/
    browser.service.ts       # Singleton de Chromium
    detection.service.ts     # Lógica de negocio Playwright
  types/
    detection.ts             # Interfaces (ApiCall, DetectRequest, DetectResponse)
  utils/
    errors.ts                # Errores tipados (AppError, ValidationError, TimeoutError)
    logger.ts                # Logger simple
```

## Flujo de `POST /detect`

1. Valida que `url` exista y sea absoluta (`http://` o `https://`).
2. Crea contexto/página de Playwright desde navegador singleton.
3. Navega a la URL y espera `networkidle`.
4. Intercepta respuestas de red y filtra solo `xhr`/`fetch`.
5. Aplica dedupe por URL.
6. Si `filters` trae elementos, solo conserva registros cuya URL contenga al menos uno de esos términos.
7. Extrae:
   - `url`
   - `method`
   - `status`
   - `timestamp`
   - `size`
   - `data` (JSON parseado cuando sea posible)
8. Cierra página/contexto en `finally` para evitar fugas.

## Instalación

```bash
npm install
npx playwright install chromium
```

## Ejecución

### Desarrollo

```bash
npm run dev
```

`npm run dev` usa `nodemon` y reinicia automáticamente al detectar cambios en `src/**/*.ts`.

### Build

```bash
npm run build
```

### Producción

```bash
npm start
```

## Docker

Build de imagen:

```bash
docker build -t api-call-detector .
```

Ejecutar contenedor:

```bash
docker run --rm -p 3000:3000 api-call-detector
```

Notas para EasyPanel/hosting:

- Configura el puerto de la app con la variable `PORT` (por ejemplo `3000` o el que te asigne la plataforma).
- El servicio responde `200` en `GET /health` y también en `GET /`.
- Si tu panel permite definir health check, usa `path: /health`.

## Versionado automático (GitHub)

El repositorio incluye un workflow de GitHub Actions en:

- `.github/workflows/auto-version-bump.yml`

Comportamiento:

- En cada `push` a `main`, incrementa automáticamente la versión `patch` de `package.json` y `package-lock.json`.
- Crea commit automático con el nuevo número de versión.
- Crea y publica un tag con formato `vX.Y.Z`.

## Dónde probar en local (Mac)

Por defecto el backend corre en puerto `3000`.

- Localhost: `http://localhost:3000`
- Loopback: `http://127.0.0.1:3000`

Si quieres probar desde otro dispositivo de tu red local:

```bash
ipconfig getifaddr en0
```

Luego usa: `http://TU_IP_LOCAL:3000`

## Swagger

- URL: `http://localhost:3000/docs`
- Desde ahí puedes ejecutar `POST /detect` y `GET /app-info` con **Try it out**
- Spec JSON directa: `http://localhost:3000/openapi.json`
- En `/docs` también se inyecta la spec inline en el HTML (`<script id="openapi-inline-spec" type="application/json">...`)

## Endpoints

### `GET /health`

Respuesta:

```json
{
  "status": "ok"
}
```

### `GET /app-info`

Respuesta:

```json
{
  "serviceName": "api-call-detector-service",
  "deployedVersion": "1.0.0",
  "environment": "production",
  "uptimeSeconds": 42,
  "timestamp": "2026-04-07T06:42:00.000Z"
}
```

### `POST /detect`

Body:

```json
{
  "url": "https://example.com/page",
  "filters": ["matchOdds", "nextmatch", "matchDetails"]
}
```

Comportamiento de `filters`:

- Si `filters` no se envía o va `[]`, devuelve todos los registros detectados.
- Si `filters` trae valores, devuelve solo registros cuya URL contenga alguna coincidencia.

Ejemplo completo:

```bash
curl -X POST "http://localhost:3000/detect" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/page","filters":["matchOdds","nextmatch","matchDetails"]}'
```

Respuesta (ejemplo):

```json
{
  "matchId": "4803340",
  "teamIds": ["10233", "9885"],
  "totalRecords": 1,
  "records": [
    {
      "url": "https://example.com/api/users",
      "method": "GET",
      "status": 200,
      "size": 12345,
      "timestamp": 171234567,
      "data": {
        "users": [
          {
            "id": 1,
            "name": "Jane"
          }
        ]
      }
    }
  ]
}
```

Notas:

- `matchId` se extrae del hash de la URL objetivo (por ejemplo `#4803340`).
- `teamIds` se extrae de requests `nextmatch` con query param `teamId` (por ejemplo `...nextmatch?teamId=10233`).

## Validaciones y errores

- `400`: URL inválida o body incompleto
- `404`: Ruta no encontrada
- `408`: Timeout de request/detección
- `500`: Error interno

Formato de error:

```json
{
  "message": "texto del error"
}
```

## Scripts disponibles

```bash
npm run dev
npm run build
npm run start
npm run typecheck
```

## Notas operativas

- El navegador Chromium se reutiliza para mejorar rendimiento.
- Cada request de detección crea un contexto nuevo para aislamiento.
- El cierre de recursos está protegido para minimizar fugas.
