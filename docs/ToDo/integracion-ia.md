# Requerimiento: integración de IA (procesamiento de material y generación de preguntas)

## Contexto

Hoy los materiales se persisten con `processingStatus = PENDING` (`apps/api/src/modules/materials/application/ports/material.repository.ts`), tanto los de texto (`POST /materials`) como las fotos/archivos (`POST /materials/upload`, almacenados en MinIO vía `ObjectStorage`). No existe ningún módulo de IA: no hay puerto `AIProvider`, ni registry ni adapter.

La arquitectura ya está especificada en `architecture/AI-SPEC.md` y `architecture/ARCHITECTURE.md` (sección 4 y 5), pero solo documentalmente. Las variables `AI_PROVIDER=deepseek`, `DEEPSEEK_API_KEY` y `DEEPSEEK_MODEL` existen en `.env.example` y `apps/api/.env` sin uso.

Regla de AGENTS.md: nunca llamar a DeepSeek desde controllers o casos de uso; usar `Controller → Use Case → AI application port → AI provider adapter`, con el dominio sin conocer proveedores.

## Objetivo

Que el usuario suba material (texto o foto de apuntes) y el sistema lo procese con IA: analizar el contenido, identificar conceptos/objetivos, y generar preguntas de opción múltiple para preparar un quiz. El estado del procesamiento debe reflejarse en el material (`PROCESSING` → `COMPLETED`/`FAILED`).

## Alcance propuesto

- Crear el puerto de aplicación `AIProvider` en `application` (interfaz: `analyzeMaterial` y `generateQuestions`; `explainAnswer` y `generateHint` quedan disponibles en la interfaz según AI-SPEC pero sin UI en este requerimiento).
- Crear el registry de proveedores (`AIProviderRegistry`) con `deepseek` como único proveedor en MVP.
- Procesar un material al crearlo (on-demand síncrono) o bajo demanda: leer contenido (para `FILE`, obtener el objeto del storage), invocar al proveedor y persistir el resultado.
- Actualizar `processingStatus` del material: `PROCESSING` durante el flujo, `COMPLETED` al terminar, `FAILED` con `processingError` si el proveedor falla.
- Persistir preguntas generadas en el modelo `Question` (y `QuestionOption`) existente en `apps/api/prisma/schema.prisma`.
- Adapter DeepSeek en `apps/api/src/infrastructure/ai/deepseek/` (`deepseek.provider.ts`, `deepseek.client.ts`, `deepseek.prompts.ts`, `deepseek.schemas.ts`, `deepseek.mapper.ts`): prompts y mapeos viven en infrastructure; validar la salida estructurada del modelo (Zod) y no confiar ciegamente en el JSON del modelo.
- Enviar al proveedor solo la información necesaria (regla de AI-SPEC).
- Mostrar el estado de procesamiento en la UI (badge PENDING / PROCESSING / COMPLETED / FAILED) y, cuando haya preguntas, tamaño del set generado.

## Cambios implicados

### Backend
- Nuevo port `AIProvider` (capa application) y tipos de dominio para `MaterialAnalysis`, `GeneratedQuestion`, `Explanation`, `Hint`.
- `infrastructure/ai/` + `ai.module.ts` global con registry y adapter DeepSeek.
- Use case de procesamiento (p. ej. `ProcessMaterialUseCase`) que: valida el material, obtiene el contenido (texto o storage), llama a `AIProvider`, mapea a `Question`/`QuestionOption` y actualiza el material.
- `MaterialRepository`: agregar operaciones para actualizar `processingStatus`/`processingError`/resultado.
- `CreateTextMaterialUseCase` / `CreateFileMaterialUseCase`: encadenar opcionalmente el procesamiento (on-demand logrando `COMPLETED`/`FAILED` en la respuesta).
- Controller/DTOs: exponer el estado y, si aplica, disparador de reprocesamiento (`POST /materials/:id/process`).
- Tests de los use cases de procesamiento y del mapper con fixtures de respuesta del modelo.

### Frontend
- `apps/web/lib/api.ts`: tipos `processingStatus` (ya expuestos) y endpoints de reprocesamiento si se decide.
- `material-dialog` / tarjetas de material: mostrar badge de estado y errores de procesamiento.
- Mostrar conteo de preguntas generadas o vínculo al quiz cuando `COMPLETED`.

## Fuera de alcance (por ahora)

- Cola/worker/BullMQ: el procesamiento es on-demand síncrono (AGENTS.md: diseñar primero la interfaz de aplicación y luego la cola sin tocar el dominio).
- Almacenamiento de prompts o metadata de generación en PostgreSQL.
- `explainAnswer` y `generateHint` con UI dedicada (la interfaz los incluye, la UI llega con el módulo Quiz/Repaso).
- Autenticación con Authentico.
- Ver imágenes en el navegador vía `getSignedUrl` (requerimiento aparte).

## Notas

- Referencia: `architecture/AI-SPEC.md`, `architecture/ARCHITECTURE.md` (§4 IA, §5 IA configurable), `requirements/ADR-0002-AI-PROVIDER.md`.
- El cambio de proveedor debe requerir solo: implementar adapter, registrarlo y configurar `AI_PROVIDER`/modelo por env, sin tocar controllers/use cases.
- Coherencia con AGENTS.md: validar inputs, manejar errores del proveedor explícitamente (`FAILED` + `processingError`), mantener funciones pequeñas y añadir tests a los use cases importantes.
- Base para el análisis: material de tipo `TEXT` (contenido en `content`) y `FILE` (objeto en `ObjectStorage` mediante `storageKey`).