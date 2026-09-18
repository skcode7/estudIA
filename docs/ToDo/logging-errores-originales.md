# Requerimiento: logging de errores originales en fallos de infraestructura (S3 / DeepSeek)

## Contexto

Hoy los `catch` de infraestructura se tragan el error original y devuelven mensajes genéricos. Hay 4 casos:

1. `apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts:45` — fallo de S3 PutObject → `ServiceUnavailableException("No se pudo almacenar el archivo. Intenta de nuevo.")`. El error original del SDK (auth, región, endpoint, bucket inexistente) nunca se loguea.
2. `apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:112` — fallo de S3 GetObject durante el procesamiento → devuelve `{ error: "No se pudo leer el archivo del almacenamiento." }` (queda como `processingError` en DB, pero la causa raíz se pierde en stdout).
3. `apps/api/src/infrastructure/ai/deepseek/deepseek.schemas.ts:60` — `JSON.parse` del output del modelo falla → `DeepSeekOutputError("El modelo no devolvió un JSON válido.")` sin loguear el raw que devolvió el modelo.
4. `apps/api/src/infrastructure/ai/deepseek/deepseek.client.ts:74` — el body de un error HTTP no es JSON → `"no se pudo leer el cuerpo del error"` (se pierde el body/status real).

Caso real que lo motiva: el 2026-09-17, una misconfiguración de Backblaze B2 (`S3_REGION` quedó en el default `us-east-1` + `S3_ENDPOINT` sin esquema `https://`) produjo el error genérico "No se pudo almacenar el archivo" en la UI. Los logs de Coolify solo mostraron el mensaje genérico; el diagnóstico exigió `docker exec` al contenedor y un PutObject de prueba manual.

AGENTS.md (sección Calidad) exige "manejar errores explícitamente" — estos catch silenciosos violan ese principio.

## Objetivo

Que todo fallo de infraestructura (S3, DeepSeek) deje el error original en stdout del contenedor (visible directamente en la pestaña Logs del recurso en Coolify) antes de devolver el mensaje genérico al usuario — sin cambiar la UX ni los mensajes existentes.

## Alcance propuesto

- En los 4 `catch`: capturar el error (`catch (error)`) y loguearlo con el `Logger` estándar de NestJS: nombre del error, mensaje, y contexto operativo (storage key + bucket en los de S3; snippet del raw truncado — p. ej. 200 chars — en los de DeepSeek; status HTTP en el cliente).
- Prioridad 1: los 2 catch de S3 (mismo tipo de fallo que el incidente real).
- Prioridad 2: los 2 catch de DeepSeek (relevantes al empezar a usar la IA, ya configurada).
- Nunca loguear credenciales ni env vars completas.

## Cambios implicados

### Backend
- `create-file-material.use-case.ts:45-47` — `catch (error)` + `Logger.error(...)` con key y bucket, manteniendo el throw genérico.
- `process-material.use-case.ts:110-114` — `catch (error)` + `Logger.error(...)` con storageKey, manteniendo el `return { error }` (el flujo FAILED no cambia).
- `deepseek.schemas.ts:58-62` — loguear snippet del raw antes de lanzar `DeepSeekOutputError`.
- `deepseek.client.ts:71-76` — loguear status + texto plano cuando el body del error no sea JSON.
- Tests: el spec existente (`create-file-material.use-case.spec.ts:128` espera el mensaje genérico) sigue pasando sin cambios (los mensajes no cambian); opcionalmente agregar assert de la llamada al logger.

### Frontend
- Sin cambios (los mensajes que ve el usuario se mantienen).

## Fuera de alcance (por ahora)

- Logging estructurado (JSON logs), niveles configurables, correlation IDs.
- Alerting/monitoring.
- Cambiar los mensajes de error que ve el usuario.

## Notas

- Coherencia con AGENTS.md: manejar errores explícitamente; no sobreingenieriar el MVP (Logger de NestJS, nada más).
- Motivación documentada: incidente B2 del 2026-09-17 (diagnóstico solo posible vía docker exec + test manual).
- El endpoint correcto de B2 quedó como `https://s3.eu-central-003.backblazeb2.com` con `S3_REGION=eu-central-003` — referencia por si la config vuelve a tocarse.
