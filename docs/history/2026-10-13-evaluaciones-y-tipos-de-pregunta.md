# Sesión: Módulo Evaluaciones + Tipos de pregunta (MC/TF/FB) + Multi-foto

**Fecha:** 2026-10-13
**Estado:** Completado

## Contexto

El MVP solo generaba preguntas de **opción múltiple** a partir de materiales de estudio (`Material` → `ProcessMaterialUseCase` → IA). Faltaba:

1. **Evaluaciones (exámenes)**: el usuario quería subir fotos de exámenes ya hechos, extraer sus preguntas (cualquier tipo) y que entraran al pool de quizzes. La sección "Repaso" era un placeholder.
2. **Tipos de pregunta**: solo existía `MULTIPLE_CHOICE`; para exámenes reales hacían falta `TRUE_FALSE` (verdadero/falso) y `FILL_BLANK` (completar), con calificación automática.
3. **Flujo en dos pasos**: el tema se debe elegir **antes** de procesar (no sugerirlo por pregunta), con análisis previo de las fotos (igual que el borrador de materiales).
4. **Migración automática en deploy**: Coolify no ejecuta migraciones por defecto; hacía falta que el contenedor las aplique al arrancar.

## Cambios realizados

### Backend

- **Esquema Prisma + migración** (`apps/api/prisma/schema.prisma` + `migrations/20261012120000_add_evaluations`):
  - `Evaluation` ligada a `Topic` (no a `Subject`): `title`, `dateTaken?`, `processingStatus`, `processingError`.
  - `EvaluationImage`: multi-foto en `evaluations/{id}/images/{uuid}.webp`.
  - `Question` gana `sourceEvaluationId` + `evaluationImageId` (`onDelete: SetNull`); las preguntas sobreviven al borrar la evaluación.
  - Enum `QuestionType` += `TRUE_FALSE` | `FILL_BLANK`.

- **Puerto IA** (`apps/api/src/modules/ai/application/ports/ai-provider.ts`):
  - `analyzeEvaluationDraft(images, catalog?)` → `EvaluationDraft` (subjectId/topicId/title sugeridos).
  - `extractEvaluationQuestions(subjectName, title, images)` → `ExtractedEvaluationQuestion[]` con `type` discriminado (`MULTIPLE_CHOICE` | `TRUE_FALSE` | `FILL_BLANK`); `TRUE_FALSE` devuelve `answer: boolean`, `FILL_BLANK` devuelve `answers: string[]`.

- **DeepSeek** (`infrastructure/ai/deepseek/`):
  - Prompts discriminados: `ANALYZE_EVALUATION_DRAFT_SYSTEM_PROMPT` + `EXTRACT_EVALUATION_QUESTIONS_SYSTEM_PROMPT` (unión discriminada por `type`).
  - Mapper (`deepseek.mapper.ts`): normaliza `TRUE_FALSE` → opciones "Verdadero"/"Falso" con la correcta marcada; `FILL_BLANK` deduplica respuestas ignorando tildes, case, puntuación y espacios.

- **Módulo Evaluations** (`apps/api/src/modules/evaluations/` — 8 use-cases, 3 repos Prisma):
  - `CreateEvaluationUseCase`: multi-foto (`POST /evaluations/upload`), valida topic, sube a storage, limpia si falla.
  - `AnalyzeEvaluationDraftUseCase`: `POST /evaluations/analyze` (flujo en dos pasos, igual que `AnalyzeMaterialDraftUseCase`).
  - `ProcessEvaluationUseCase`: extrae preguntas vía IA, **todas** asignadas al topic elegido por el usuario, guarda con trazabilidad a foto de origen.
  - CRUD preguntas: listar, actualizar (reclasificar topic, cambiar tipo), borrar.
  - `DeleteEvaluationUseCase`: borra fotos del storage, preguntas quedan en pool (`sourceEvaluationId` → `NULL`).

- **Quizzes grading** (`apps/api/src/modules/quizzes/`):
  - `QuizGradingQuestion` + `QuizQuestionPresentation` ganan `type: QuizQuestionType`.
  - `SubmitQuizAttemptUseCase`: califica `FILL_BLANK` con `matchesAnyAnswer` (normaliza tildes/case/puntuación/espacios); `TRUE_FALSE` usa `boolean` de la opción; DTOs con `answerText` y `selectedOptionId` nullable.
  - `text.utils.ts`: `normalizeAnswer` (NFD, quita diacríticos, puntuación, colapsa espacios, lowercase) + `matchesAnyAnswer`.

- **Tests**: 149 tests API + 7 web (100% passing); mocks actualizados para `analyzeEvaluationDraft` y `type` en fixtures.

### Frontend

- **Navegación** (`apps/web/lib/navigation.ts`): `review` → `evaluations` 📝 "Evaluaciones".
- **API client** (`apps/web/lib/api.ts` + `api.spec.ts`):
  - `createEvaluation({ subjectId, title, dateTaken?, files: File[] })` → `FormData` multi-foto ordenado.
  - `listEvaluations(subjectId)`, `processEvaluation(id)`, `deleteEvaluation(id)`.
  - CRUD preguntas: `list/update/deleteEvaluationQuestions`.
- **Vistas** (`apps/web/components/views/evaluations-view.tsx`): lista por materia con badge de estado, botón Procesar, Ver preguntas, Eliminar (aviso que preguntas sobreviven).
- **Diálogos**:
  - `evaluation-dialog.tsx`: subida multi-foto (orden, preview, quitar), título, fecha opcional.
  - `evaluation-questions-dialog.tsx`: edición completa (enunciado, opciones, correcta, **badge de tipo**, reclasificación por topic, imagen de origen).

### Docker / Deploy

- `apps/api/package.json`: scripts `db:generate` + `db:deploy` (`prisma migrate deploy`).
- `apps/api/Dockerfile`: copia carpeta `prisma/` a runtime; `CMD ["sh", "-c", "pnpm --filter @estudia/api db:deploy && node dist/main"]` → migraciones automáticas en cada arranque/re-deploy en Coolify.

### Documentación

- `docs/ToDo/modo-generacion-preguntas.md`: selector por material (`BASED_ON_MATERIAL` | `SIMILAR_QUESTIONS`) + prompt builder por modo.
- `docs/ToDo/modulo-evaluaciones.md`: especificación completa del módulo (entity, endpoints, UI, quiz integration, decisiones).

## Validaciones

- `pnpm lint` ✓ (0 errores)
- `pnpm typecheck` ✓
- `pnpm test` ✓ — **156 tests** (149 API + 7 web)
- `pnpm build` ✓ (API + Web compilados)
- `pnpm --filter @estudia/api prisma validate` ✓ (schema válido, migración coincide con diff de Prisma)

## Commits (10 atómicos)

| Hash | Descripción |
|------|-------------|
| fcbfce4 | feat(evaluations): add Evaluation and EvaluationImage models with migration |
| 04b5cc8 | feat(ai): add extractEvaluationQuestions and analyzeEvaluationDraft to AIProvider |
| 4acb4ef | feat(evaluations): new module for exam upload and question extraction |
| 5c740de | feat(quizzes): support TRUE_FALSE and FILL_BLANK question types in grading |
| d1f3043 | feat(shared): add normalizeAnswer and matchesAnyAnswer for fill-blank grading |
| 861ebef | feat(web): replace Repaso with Evaluaciones in navigation and add API endpoints |
| bc36f69 | feat(web): add evaluation dialog, questions dialog, and evaluations view |
| 20f4198 | docs(todo): add requirements for question generation mode and evaluations module |
| 25616cf | chore(docker): add db:deploy script and run migrations on container start |
| f66052a | test: update mocks for new AIProvider methods and quiz types |

## Pendientes / próximos pasos

- Implementar `docs/ToDo/modo-generacion-preguntas.md` (selector "Basadas en el material" / "Preguntas similares" en carga de material + prompt builder por modo).
- Usar evaluaciones como **guía de estilo** para `generateQuestions` (fase 2 del módulo evaluaciones).
- UI de "temas a reforzar" consumiendo `TopicProgress` + `Answer.isCorrect` (ya disponible tras este cambio).
- Validar si `explainAnswer`/`generateHint` del puerto IA se usan en futuro repaso/estudio.