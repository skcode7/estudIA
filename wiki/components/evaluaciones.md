---
title: Módulo de evaluaciones
type: entity
responsibility: Dueño de la entidad Evaluation: subida multi-foto de exámenes, extracción de preguntas con IA y revisión antes de incluirlas en el pool de quizzes.
sources:
  - apps/api/prisma/schema.prisma
  - apps/api/src/modules/evaluations/evaluations.module.ts
  - apps/api/src/modules/evaluations/presentation/controllers/evaluations.controller.ts
  - apps/api/src/modules/evaluations/application/ports/evaluation.repository.ts
  - apps/api/src/modules/evaluations/infrastructure/prisma-evaluation.repository.ts
  - apps/api/src/modules/evaluations/application/use-cases/create-evaluation.use-case.ts
  - apps/api/src/modules/evaluations/application/use-cases/process-evaluation.use-case.ts
  - apps/api/src/modules/evaluations/application/use-cases/list-evaluations.use-case.ts
  - apps/api/src/modules/ai/application/ports/ai-provider.ts
  - apps/web/components/views/evaluations-view.tsx
  - apps/web/components/dialogs/evaluation-dialog.tsx
synced: a9c3163
related:
  - ../components/ia.md
  - ../components/quizzes.md
  - ../flows/generar-y-resolver-quiz.md
---

# Módulo de evaluaciones

El módulo de evaluaciones permite subir fotos de un examen o prueba y extraer de ellas preguntas
con IA para añadirlas al mismo pool que usa el quiz. Reemplazó a la vista de "Repaso"
(`apps/web/lib/navigation.ts:6`) y sigue el mismo patrón de capas que el resto de la API.

## Qué es una Evaluation

`Evaluation` (`apps/api/prisma/schema.prisma:100`) es un examen fotografiado que pertenece a un
tema (`topicId`) y lleva título, fecha opcional y un estado de procesamiento idéntico al de los
materiales: `PENDING → PROCESSING → COMPLETED | FAILED`. A diferencia de `Material`, una evaluación
tiene varias fotos (`EvaluationImage`, `apps/api/prisma/schema.prisma:117`) y sus preguntas
extraídas se guardan como `Question` normales con trazabilidad (`sourceEvaluationId`,
`evaluationImageId`, `apps/api/prisma/schema.prisma:141-142`).

## Subir y procesar

La vista dispara la subida con varias fotos en un solo `FormData`
(`apps/web/components/dialogs/evaluation-dialog.tsx:66`), usando el campo `files`. El controller las
recibe con `FilesInterceptor` (`apps/api/src/modules/evaluations/presentation/controllers/evaluations.controller.ts:79`),
valida que haya al menos una y delega en `CreateEvaluationUseCase`.

`CreateEvaluationUseCase` (`apps/api/src/modules/evaluations/application/use-cases/create-evaluation.use-case.ts:46`)
reserva un `id` antes de subir, guarda cada foto con clave `evaluations/<evaluationId>/images/<uuid>.webp`
(`apps/api/src/modules/evaluations/application/use-cases/create-evaluation.use-case.ts:60`) y, si
alguna subida falla, borra lo subido y devuelve `503`. La evaluación nace `PENDING` y la página la
procesa inmediatamente (`apps/web/components/views/evaluations-view.tsx:285`), igual que con los
materiales.

`ProcessEvaluationUseCase` (`apps/api/src/modules/evaluations/application/use-cases/process-evaluation.use-case.ts:39`)
lee las fotos del storage, las envía al modelo con `AIProvider.extractEvaluationQuestions`
(`apps/api/src/modules/ai/application/ports/ai-provider.ts:143`) y persiste las preguntas extraídas
con `EvaluationQuestionRepository.replaceForEvaluation`. El modelo recibe el nombre de la materia y
el título de la evaluación para contextualizar la extracción.

## Revisión antes de incluir

Las preguntas extraídas no entran directamente en los quizzes: la vista ofrece un diálogo de
revisión donde se pueden editar o eliminar antes de que el estudiante las vea. El endpoint
`GET /evaluations/:id/questions` devuelve las preguntas con sus opciones y la respuesta correcta,
y `PATCH /evaluations/:id/questions/:questionId` permite reclasificar la pregunta a otro tema de la
misma materia, cambiar su tipo (opción múltiple, verdadero/falso, rellenar), o ajustar opciones.

## Integración con los quizzes

Una vez extraídas, las preguntas son `Question` como las demás: `GenerateQuizUseCase` las incluye
en el pool a través de `findQuestionIdsByTopics`, que no distingue entre preguntas de materiales y
preguntas de evaluaciones. Las preguntas con imagen de evaluación se sirven por
`GET /evaluations/:id/images/:imageId` (`apps/api/src/modules/evaluations/presentation/controllers/evaluations.controller.ts:142`),
usando la misma ruta relativa que el quiz resuelve con `assetUrl`.

## Límites

- Solo se aceptan imágenes (JPG, PNG, GIF, WebP), máximo 10 fotos y 10 MB cada una
  (`apps/api/src/modules/evaluations/presentation/controllers/evaluations.controller.ts:41-42`).
- No hay análisis de borrador para evaluaciones: el usuario elige directamente materia, tema y
  título.
- Borrar una evaluación borra las fotos del storage (`DeleteEvaluationUseCase`) pero deja las
  preguntas ya extraídas en el pool; el mensaje de confirmación lo advierte.
