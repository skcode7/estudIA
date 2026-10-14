# Requerimiento: sección Evaluaciones (carga de exámenes con extracción de preguntas)

## Contexto

La sección "Repaso" es un placeholder: `apps/web/lib/navigation.ts` declara
`["review", "↻", "Repaso"]` y `apps/web/app/page.tsx` manda esa vista a `PlaceholderView`
("Esta sección estará disponible próximamente."). No hay funcionalidad que preservar.

El pool de preguntas de los quizzes solo se enriquece hoy desde los materiales de estudio:
`ProcessMaterialUseCase` genera preguntas con IA y las persiste con
`questionRepository.replaceForMaterial(...)`, y `GenerateQuizUseCase` simplemente muestrea
`findQuestionIdsByTopics(...)`. Las evaluaciones (exámenes, pruebas) que el estudiante ya tiene son
una fuente valiosa que hoy no se aprovecha:

- Definen la **mecánica real** de la materia (tipo de enunciados, formato, dificultad).
- Traen preguntas **con respuesta**, listas para incluir en el quiz sin generarlas con IA.
- Al llevar tema asignado, el desempeño sobre ellas revela **qué temas reforzar**.

Hoy no existe forma de cargarlas: `Material` solo modela material de estudio de un tema.

## Objetivo

Una sección "Evaluaciones" (que reemplaza a "Repaso") donde el usuario suba una evaluación como
**varias fotos**, el sistema extraiga con IA las preguntas/respuestas, el usuario las revise y las
incluya en el pool de preguntas para que entren en los quizzes.

## Alcance propuesto

- Nueva entidad `Evaluation` ligada a **Subject** (no a Topic) + `EvaluationImage` para las fotos.
  Decisión de modelado en Notas.
- Upload de más de una foto por evaluación, almacenadas con la abstracción ObjectStorage existente
  (`evaluations/{evaluationId}/images/{uuid}.webp`), con el mismo patrón de procesamiento on-demand
  que `Material` (`processingStatus` PENDING/PROCESSING/COMPLETED/FAILED).
- Nuevo método del puerto `AIProvider.extractEvaluationQuestions({ images, catalog })`: extrae
  preguntas con opciones, respuesta correcta, dificultad y **tema sugerido** del catálogo de la
  materia (mismo patrón de catálogo que `AnalyzeMaterialDraftUseCase` para sugerir IDs válidos,
  nunca inventados). Salida validada con Zod en cada adaptador, como el resto de la integración.
- Revisión antes de incluir: listar, editar y eliminar las preguntas extraídas (patrón ya existente
  en `PATCH /materials/:id/questions/:questionId` de `materials.controller.ts`).
- Al confirmar, las preguntas se crean como `Question` normales con `topicId`, por lo que entran en
  los quizzes por el camino actual (`findQuestionIdsByTopics`) **sin tocar `GenerateQuizUseCase`**.
- `Question` gana campos nullable de trazabilidad: `sourceEvaluationId` y `evaluationImageId`
  (`onDelete: SetNull`), análogos a `sourceMaterialId`/`imageId`, para poder mostrar la imagen de
  origen en el quiz (como hace hoy `toQuestionImageUrl` en `quizzes.controller.ts`).
- Navegación: el ítem `review` pasa a `evaluations` con label "Evaluaciones" en
  `apps/web/lib/navigation.ts`, y `app/page.tsx` lo enruta a una vista nueva
  (`components/views/evaluations-view.tsx`) con upload multi-foto, estado de procesamiento, listado
  de evaluaciones y revisión de preguntas extraídas.

## Cambios implicados

### Backend
- `apps/api/prisma/schema.prisma`: modelos `Evaluation` (subjectId, title, dateTaken?, campos de
  procesamiento) y `EvaluationImage` (storageKey, label, order); campos `sourceEvaluationId` /
  `evaluationImageId` en `Question`; migración.
- Módulo nuevo `apps/api/src/modules/evaluations` con la estructura del resto de módulos
  (presentation/controllers + dto, application/use-cases + ports, infrastructure/prisma-evaluation.repository):
  crear evaluación multi-foto, procesar, listar, editar/eliminar preguntas extraídas. Sin lógica de
  negocio en controllers (AGENTS.md).
- `apps/api/src/modules/ai/application/ports/ai-provider.ts`: `extractEvaluationQuestions` con su
  tipo de entrada y su tipo de salida (`ExtractedEvaluationQuestion[]`). Implementación en
  `infrastructure/ai/deepseek` (provider + prompts + schemas Zod).
- `apps/api/src/modules/quizzes/presentation/controllers/quizzes.controller.ts`: URL de imagen de
  origen para preguntas provenientes de evaluaciones.
- Tests: use cases de extracción/inclusión; el mapeo de preguntas extraídas a `Question` (topicId
  resuelto contra el catálogo real).

### Frontend
- `apps/web/lib/api.ts`: funciones nuevas (crear evaluación, subir fotos, procesar, listar/editar
  preguntas) y tipos.
- `apps/web/lib/navigation.ts` + `apps/web/app/page.tsx`: reemplazar `review` por `evaluations`.
- `components/views/evaluations-view.tsx` (nuevo) + diálogo de carga multi-foto (varias imágenes
  por evaluación) + editor de preguntas extraídas.

## Fuera de alcance (por ahora)

- Usar las evaluaciones como **referencia de estilo** para `generateQuestions` (direccionar la
  mecánica de las preguntas generadas). Fase 2: pasar el contenido de evaluaciones como contexto de
  estilo al prompt.
- UI de "temas a reforzar": la señal ya queda disponible (`Answer.isCorrect` → `TopicProgress` con
  `topicId`); mostrarla es parte de `docs/ToDo/exponer-progreso-basico.md` /
  `docs/ToDo/generacion-inteligente-quiz.md`.
- Contestar la evaluación dentro de la app con nota o comparación con la evaluación original.
- Corrección de respuestas abiertas escritas por el alumno: en el MVP solo se extraen preguntas de
  opción múltiple, igual que el generador actual (`generatedQuestionSchema`).
- Preguntas de opción múltiple con más de una correcta.
- PDFs de evaluaciones (ver `docs/ToDo/procesamiento-documentos-ia.md`); el MVP es foto/imagen.

## Notas

- **Decisión de modelado**: entidad `Evaluation` propia en vez de reutilizar `Material` con un campo
  `kind`. Motivo: `Material.topicId` es obligatorio (y `Topic` borra en cascada sus materiales),
  mientras una evaluación abarca varios temas de la materia; además semántica y ciclo de vida
  distintos (una evaluación no es contenido de estudio, sino fuente de preguntas y de desempeño).
  El costo asumido es un módulo nuevo y dos campos nullable en `Question`.
- Coherente con AGENTS.md: procesamiento on-demand (si luego es lento, la interfaz de aplicación ya
  permite colas sin tocar el dominio), ObjectStorage S3-compatible, IA solo vía puerto/adaptador
  (DeepSeek en infrastructure), Zod para salida de IA y class-validator para DTOs.
- Las preguntas extraídas entran al mismo pool que las generadas, así que se benefician gratis de
  la selección por desempeño (`docs/ToDo/generacion-inteligente-quiz.md`) y del historial
  (`docs/ToDo/listado-quizzes-con-resultado.md`).
- Relacionados: `docs/ToDo/ciclo-vida-preguntas-material.md` (ya anticipa preguntas "sacadas de
  otra evaluación" sin material de origen), `docs/ToDo/pistas-y-explicaciones-quiz.md`
  (`explainAnswer`/`generateHint` del puerto siguen sin uso; un futuro repaso podría alojarse en
  esta misma sección).
- Al reemplazar "Repaso" por "Evaluaciones" no se pierde nada: la vista actual es un placeholder.
