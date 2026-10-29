---
title: Módulo de evaluaciones
type: entity
responsibility: Dueño de la entidad Evaluation: subida multi-foto de exámenes, extracción de preguntas con IA y revisión antes de incluirlas en el pool de quizzes.
sources:
  - apps/api/prisma/schema.prisma
  - apps/api/src/modules/evaluations/evaluations.module.ts
  - apps/api/src/modules/evaluations/presentation/controllers/evaluations.controller.ts
  - apps/api/src/modules/evaluations/presentation/dto/evaluations.dto.ts
  - apps/api/src/modules/evaluations/application/ports/evaluation.repository.ts
  - apps/api/src/modules/evaluations/application/ports/evaluation-image.repository.ts
  - apps/api/src/modules/evaluations/infrastructure/prisma-evaluation.repository.ts
  - apps/api/src/modules/evaluations/infrastructure/prisma-evaluation-image.repository.ts
  - apps/api/src/modules/evaluations/application/use-cases/create-evaluation.use-case.ts
  - apps/api/src/modules/evaluations/application/use-cases/process-evaluation.use-case.ts
  - apps/api/src/modules/evaluations/application/use-cases/list-evaluations.use-case.ts
  - apps/api/src/modules/evaluations/application/use-cases/delete-evaluation.use-case.ts
  - apps/api/src/modules/evaluations/application/use-cases/analyze-evaluation-draft.use-case.ts
  - apps/api/src/modules/evaluations/application/use-cases/get-evaluation-image.use-case.ts
  - apps/api/src/modules/ai/application/ports/ai-provider.ts
  - apps/web/components/views/evaluations-view.tsx
  - apps/web/components/dialogs/evaluation-dialog.tsx
synced: 4b7f1f3
related:
  - ../components/ia.md
  - ../components/quizzes.md
  - ./preguntas-de-evaluacion.md
  - ../flows/generar-y-resolver-quiz.md
---

# Módulo de evaluaciones

El módulo de evaluaciones permite subir fotos de un examen o prueba y extraer de ellas preguntas
con IA para añadirlas al mismo pool que usa el quiz. La web la presenta como «Evaluaciones» en su
propia vista (`apps/web/components/views/evaluations-view.tsx:156`), siguiendo el mismo patrón de
capas que el resto de la API.

## Qué es una Evaluation

`Evaluation` (`apps/api/prisma/schema.prisma:108`) es un examen fotografiado que pertenece a un
tema (`topicId`) y lleva título, fecha opcional y un estado de procesamiento idéntico al de los
materiales: `PENDING → PROCESSING → COMPLETED | FAILED`. A diferencia de `Material`, una evaluación
tiene varias fotos (`EvaluationImage`, `apps/api/prisma/schema.prisma:125`) y sus preguntas
extraídas se guardan como `Question` normales con trazabilidad (`sourceEvaluationId`,
`evaluationImageId`, `apps/api/prisma/schema.prisma:149-148`).

## Subir y procesar

La vista dispara la subida con varias fotos en un solo `FormData`
(`apps/web/components/dialogs/evaluation-dialog.tsx:67`), usando el campo `files`. El controller las
recibe con `FilesInterceptor` (`apps/api/src/modules/evaluations/presentation/controllers/evaluations.controller.ts:79`),
valida que haya al menos una y delega en `CreateEvaluationUseCase`.

`CreateEvaluationUseCase` (`apps/api/src/modules/evaluations/application/use-cases/create-evaluation.use-case.ts:46`)
reserva un `id` antes de subir, guarda cada foto con clave `evaluations/<evaluationId>/images/<uuid>.webp`
(`apps/api/src/modules/evaluations/application/use-cases/create-evaluation.use-case.ts:60`) y, si
alguna subida falla, borra lo subido y devuelve `503`. La evaluación nace `PENDING` y la página la
procesa inmediatamente (`apps/web/components/views/evaluations-view.tsx:286`), igual que con los
materiales.

`ProcessEvaluationUseCase` (`apps/api/src/modules/evaluations/application/use-cases/process-evaluation.use-case.ts:39`)
lee las fotos del storage, las envía al modelo con `AIProvider.extractEvaluationQuestions`
(`apps/api/src/modules/ai/application/ports/ai-provider.ts:155`) y persiste las preguntas extraídas
con `EvaluationQuestionRepository.replaceForEvaluation`. El modelo recibe el nombre de la materia y
el título de la evaluación para contextualizar la extracción.

## Clasificar antes de guardar: un endpoint sin cliente en la web

Antes de crear la evaluación, `POST /evaluations/analyze` acepta las mismas fotos y devuelve una
propuesta de materia, tema y título. `AnalyzeEvaluationDraftUseCase` limita la propuesta al catálogo
real —si el modelo sugiere un id que no existe, lo devuelve como `null`
(`apps/api/src/modules/evaluations/application/use-cases/analyze-evaluation-draft.use-case.ts:110`)—,
acota los temas a la materia ya elegida si llega `subjectId`, y traduce un fallo del proveedor en un
`503` con mensaje para la pantalla
(`apps/api/src/modules/evaluations/application/use-cases/analyze-evaluation-draft.use-case.ts:64`).

**La web no usa este endpoint**: no hay `analyzeEvaluationDraft` en `apps/web/lib/api.ts` y el
diálogo de subida pide materia, tema y título a mano. Es un caso de uso implementado y sin cliente,
como `AIProvider.generateHint`; por eso la evaluación no se presenta como "elegí una foto y confirmá
lo que propone la IA" sino como un formulario.

## Revisión antes de incluir

Las preguntas extraídas no entran directamente en los quizzes: la vista ofrece un diálogo de
revisión donde se pueden editar o eliminar antes de que el estudiante las vea. Las reglas de las
opciones, los `404` de pertenencia y el funcionamiento del diálogo viven en
[Preguntas extraídas de una evaluación](./preguntas-de-evaluacion.md).

## Integración con los quizzes

Una vez extraídas, las preguntas son `Question` como las demás: `GenerateQuizUseCase` las incluye
en el pool a través de `findQuestionIdsByTopics`, que no distingue entre preguntas de materiales y
preguntas de evaluaciones. Las preguntas con imagen de evaluación se sirven por
`GET /evaluations/:id/images/:imageId` (`apps/api/src/modules/evaluations/presentation/controllers/evaluations.controller.ts:142`),
usando la misma ruta relativa que el quiz resuelve con `assetUrl`. Ese endpoint lee el objeto del
storage con `ObjectStorage.getObject` y deduce el `Content-Type` de la extensión de la clave
(`apps/api/src/modules/evaluations/application/use-cases/get-evaluation-image.use-case.ts:41`); una
imagen que no existe —o cuyo objeto no se puede leer— es un `404`, y la imagen debe pertenecer a la
evaluación de la ruta (`apps/api/src/modules/evaluations/application/use-cases/get-evaluation-image.use-case.ts:23`).

## Límites

- Solo se aceptan imágenes (JPG, PNG, GIF, WebP), máximo 10 fotos y 10 MB cada una
  (`apps/api/src/modules/evaluations/presentation/controllers/evaluations.controller.ts:41-42`).
- El análisis de borrador existe en la API (`POST /evaluations/analyze`) pero ningún cliente lo
  llama: la web pide materia, tema y título a mano. La versión anterior de esta página afirmaba que
  el análisis "no existía"; era inexacto desde que el módulo aterrizó (`4acb4ef`), porque confundía
  "no está en la interfaz" con "no está implementado".
- Borrar una evaluación borra las fotos del storage y deja las preguntas ya extraídas en el pool:
  su `sourceEvaluationId` pasa a `null` por la cascada `SetNull` del esquema, así que siguen contando
  como preguntas de la materia
  (`apps/api/src/modules/evaluations/application/use-cases/delete-evaluation.use-case.ts:17`). El
  mensaje de confirmación lo advierte. Si borrar una foto del storage falla, el borrado sigue: solo
  deja un aviso en el log
  (`apps/api/src/modules/evaluations/application/use-cases/delete-evaluation.use-case.ts:35`).
