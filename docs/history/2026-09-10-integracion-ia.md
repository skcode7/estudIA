# Sesión: Integración de IA (procesamiento de material y generación de preguntas)

**Fecha:** 2026-09-10
**Estado:** Completado

## Contexto

Los materiales se persistían con `processingStatus = PENDING` (texto y fotos) sin ningún módulo de IA: no existía puerto `AIProvider`, ni registry ni adapter, aunque `architecture/AI-SPEC.md` y `architecture/ARCHITECTURE.md` ya lo especificaban documentalmente. Esta sesión implementa el flujo completo: procesar un material (texto o imagen) con DeepSeek, rellenar los campos del material con el análisis (editables), persistir preguntas de opción múltiple y reflejar el estado del material en la UI.

Decisiones del cliente: DeepSeek V4.1 Flash con visión nativa (`DEEPSEEK_MODEL=deepseek-flash`, imágenes vía Chat Completions OpenAI-compatible con bloques `image_url` base64); flujo on-demand síncrono con reproceso (`POST /materials/:id/process`); pipeline en dos llamadas (`analyzeMaterial` + `generateQuestions`); el análisis completo se guarda en ObjectStorage (`topics/{topicId}/materials/{materialId}/analysis.json`, best-effort); default 3 preguntas (`AI_QUESTIONS_PER_MATERIAL`); solo imágenes (no-imagen → `FAILED` con `processingError`).

## Cambios realizados

### Backend

- **Módulo AI** (`src/modules/ai/`):
  - Port `AIProvider` (`application/ports/ai-provider.ts`) con `analyzeMaterial`, `generateQuestions`, `explainAnswer`, `generateHint` y tipos de dominio (`MaterialAnalysis`, `GeneratedQuestion`, `Explanation`, `Hint`, etc.).
  - `ai.module.ts` `@Global()` que provee `AIProviderRegistry` y `AIProvider` resuelto por env `AI_PROVIDER` (default `deepseek`).
- **Adapter DeepSeek** (`src/infrastructure/ai/`):
  - `ai.registry.ts`: `CommonAIProviderRegistry` + `resolveAIProviderId`.
  - `deepseek/`: `deepseek.client.ts` (fetch nativo a `/chat/completions`, opción `json:false` para explain/hint, config leída por uso para no fallar el boot sin API key), `deepseek.prompts.ts`, `deepseek.schemas.ts` (zod + `parseModelJson` + `DeepSeekOutputError`), `deepseek.mapper.ts` (+spec), `deepseek.provider.ts`.
- **In storage** (`src/infrastructure/object-storage/`): `getObject(key)` añadido al puerto y a `s3.object-storage.ts` (GetObjectCommand + `transformToByteArray()`).
- **Módulo Materials** (`src/modules/materials/`):
  - Port `MaterialQuestionRepository` (+ impl Prisma `prisma-material-question.repository.ts`): `countByMaterials` (Map con conteo por material) y `replaceForMaterial` (borra y reescribe preguntas, idempotente).
  - `MaterialRepository`: `updateProcessingStatus` y `updateFields` (+ `UpdateMaterialFieldsInput`).
  - Use cases: `process-material` (valida material, obtiene contenido texto o storage, `analyzeMaterial` → rellena `title`/`content`, guarda análisis en storage, `generateQuestions` → persiste preguntas, `COMPLETED`/`FAILED` + `processingError`) y `update-material` (edición de título/contenido), ambos con `.spec.ts`. Specs de los use cases de creación/listado actualizados con `questionCount`.
  - Controller/DTOs: `POST /materials/:id/process`, `PATCH /materials/:id`, `questionCount` en `MaterialDto` (incluido en las respuestas de creación).
- Infra: `app.module.ts` importa `AIModule`; `.env.example` con `DEEPSEEK_MODEL=deepseek-flash` y `AI_QUESTIONS_PER_MATERIAL=3`.

### Frontend

- `lib/api.ts`: `questionCount` en `ApiMaterial`, `ApiMaterialEditInput`, `processMaterial` y `updateMaterial`.
- `components/ui/material-status-badge.tsx`: badge PENDING/PROCESSING/COMPLETED/FAILED.
- `components/views/materials-view.tsx`: selectores materia→tema, lista de materiales con badge, errores de procesamiento, botón «✨ IA mode» y edición; sin setState síncrono en efectos.
- `components/dialogs/material-edit-dialog.tsx`: edición de título/contenido.
- `components/dialogs/material-dialog.tsx`: toggle «✨ Procesar con IA mode» (default on); `onCreated(created, useAi)`.
- `app/page.tsx`: ruteo de la vista Materiales y orquestación del procesado post-create (avisos de estado y refresco de contadores); `lib/navigation.ts` con ítem «Materiales».

### Documentación

- `docs/ToDo/integracion-ia.md` eliminado (alcance completo).
- Nuevos futuros ToDo: `docs/ToDo/procesamiento-documentos-ia.md` (PDF/doc vía DeepSeek Files API o proveedor por formato) y `docs/ToDo/preguntas-segun-longitud-material.md` (bandas según extensión del contenido).

## Validaciones

- `pnpm typecheck` (turbo, api + web): 2/2 OK.
- `pnpm lint` (turbo, api + web): 2/2 OK.
- `pnpm --filter @estudia/api test`: 19 archivos, 51 tests OK.
- `pnpm --filter @estudia/api build`: OK (Nest compila).
- `pnpm --filter @estudia/web test`: sin tests (exit 0).

## Commits

| Hash | Descripción |
|---|---|
| 85b9bda | feat(backend): add AI provider port, registry and DeepSeek adapter |
| 9d37791 | feat(backend): process materials with AI and persist generated questions |
| 58ae3ce | feat(frontend): add materials view with status badge, edit dialog and IA mode |
| 6d6cc21 | docs(ToDo): add future AI requirements and remove completed integration spec |

## Pendientes / próximos pasos

- Procesamiento de documentos (PDF/doc) con IA — `docs/ToDo/procesamiento-documentos-ia.md`.
- Preguntas ajustadas a la longitud del material — `docs/ToDo/preguntas-segun-longitud-material.md`.
- Prueba E2E real con API key de DeepSeek, Postgres y MinIO (requiere `DEEPSEEK_API_KEY`).
- `explainAnswer` y `generateHint` ya están en el puerto; la UI llega con el módulo Quiz/Repaso.
- Ver/descargar fotos con `getSignedUrl` (requerimiento aparte).