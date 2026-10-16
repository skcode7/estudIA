---
title: Preguntas extraídas de una evaluación
type: entity
responsibility: Dueño del ciclo de vida de las preguntas que salen de un examen — extracción, revisión antes de publicarlas y las reglas de opciones por tipo de pregunta.
sources:
  - apps/api/src/modules/evaluations/application/ports/evaluation-question.repository.ts
  - apps/api/src/modules/evaluations/application/questions/evaluation-question-options.ts
  - apps/api/src/modules/evaluations/application/use-cases/list-evaluation-questions.use-case.ts
  - apps/api/src/modules/evaluations/application/use-cases/update-evaluation-question.use-case.ts
  - apps/api/src/modules/evaluations/application/use-cases/delete-evaluation-question.use-case.ts
  - apps/api/src/modules/evaluations/infrastructure/prisma-evaluation-question.repository.ts
  - apps/api/src/modules/evaluations/presentation/controllers/evaluations.controller.ts
  - apps/api/src/modules/evaluations/presentation/dto/evaluations.dto.ts
  - apps/web/components/dialogs/evaluation-questions-dialog.tsx
synced: 5e9017a
related:
  - ./evaluaciones.md
  - ./quizzes.md
  - ./materiales.md
---

# Preguntas extraídas de una evaluación

El módulo de evaluaciones tiene dos mitades con puerto propio: la evaluación con sus fotos (ver
[Módulo de evaluaciones](./evaluaciones.md)) y las preguntas que la IA saca de ellas, que viven en
la tabla global `Question` con `sourceEvaluationId` como rastro. Esta página es la segunda mitad:
qué reglas tienen sus opciones, cómo se revisan antes de que el estudiante las vea y por qué
corregir una pregunta significa reemplazarla.

## Reemplazar es el único modo de escribir

`replaceForEvaluation` (`apps/api/src/modules/evaluations/infrastructure/prisma-evaluation-question.repository.ts:39`)
borra en una transacción todas las preguntas de la evaluación y crea las nuevas una por una. Crea una
por una a propósito: cada pregunta trae ya su `topicId` resuelto por el modelo, así que este
repositorio no puede heredar el tema de la evaluación como hace el de materiales
(`apps/api/src/modules/evaluations/infrastructure/prisma-evaluation-question.repository.ts:35`).
Si la evaluación no existe, devuelve `0` sin crear nada.

Eso deja una consecuencia para el resto del sistema: reprocesar una evaluación destruye las
preguntas antiguas y arrastra lo que colgaba de ellas —`QuizQuestion` y `Answer`—, la misma cascada
que reprocesar un material (ver [Módulo de quizzes](./quizzes.md)).

## Las reglas de opciones son una sola función, por tipo

`assertValidQuestionOptions` (`apps/api/src/modules/evaluations/application/questions/evaluation-question-options.ts:20`),
y no el DTO, es quien decide qué es una pregunta respondible. Vive en `application/` para que la
extracción con IA y la edición manual desde la revisión pasen por el mismo filtro
(`apps/api/src/modules/evaluations/application/questions/evaluation-question-options.ts:12`). Cada
caso tiene su propio error:

- Toda opción necesita texto (se compara con `trim`).
- `MULTIPLE_CHOICE`: entre 2 y 6 opciones, exactamente una correcta
  (`apps/api/src/modules/evaluations/application/questions/evaluation-question-options.ts:45`).
- `TRUE_FALSE`: exactamente dos opciones y una correcta
  (`apps/api/src/modules/evaluations/application/questions/evaluation-question-options.ts:48`).
- `FILL_BLANK`: entre 1 y 6 **respuestas aceptadas**, y todas van marcadas como correctas
  (`apps/api/src/modules/evaluations/application/questions/evaluation-question-options.ts:31`). El
  cotejo de lo que escribe el estudiante contra esa lista no vive aquí, sino en la corrección del
  quiz.

El DTO de la edición vuelve a acotar 1 y 6 opciones
(`apps/api/src/modules/evaluations/presentation/dto/evaluations.dto.ts:239`), pero solo como forma
del cuerpo: la regla semántica está en la función compartida.

## Revisar: editar sin poder salirse de la evaluación

`GET /evaluations/:id/questions` falla con `404` si la evaluación no existe
(`apps/api/src/modules/evaluations/application/use-cases/list-evaluation-questions.use-case.ts:17`)
y devuelve las preguntas en orden de creación
(`apps/api/src/modules/evaluations/infrastructure/prisma-evaluation-question.repository.ts:78`).

`PATCH /evaluations/:id/questions/:questionId` pasa por `UpdateEvaluationQuestionUseCase`, que
comprueba tres cosas antes de escribir: que la evaluación exista, que la pregunta sea **de esa**
evaluación (`findByIdForEvaluation`, así que una pregunta ajena da `404` y no se puede editar por
error, `apps/api/src/modules/evaluations/application/use-cases/update-evaluation-question.use-case.ts:47`)
y que la imagen indicada pertenezca a la evaluación
(`apps/api/src/modules/evaluations/application/use-cases/update-evaluation-question.use-case.ts:67`).
El enunciado se recorta y no puede quedar vacío
(`apps/api/src/modules/evaluations/application/use-cases/update-evaluation-question.use-case.ts:54`).

El tema es el único campo con regla relacional: si se manda uno distinto, debe existir y compartir
materia con el tema actual de la pregunta; si no, `400` "El tema elegido no pertenece a la materia
de la evaluación" (`apps/api/src/modules/evaluations/application/use-cases/update-evaluation-question.use-case.ts:94`).
No mandar tema, o mandar el mismo, deja el actual intacto.

Guardar reemplaza las opciones: el repositorio borra todas las de la pregunta y crea las nuevas
dentro de la misma transacción
(`apps/api/src/modules/evaluations/infrastructure/prisma-evaluation-question.repository.ts:111`),
de modo que **los `id` de las opciones cambian en cada guardado**. El diálogo lo tolera porque
trabaja con el enunciado y el texto, no con los ids.

`DELETE /evaluations/:id/questions/:questionId` es el mismo filtro de pertenencia
(`apps/api/src/modules/evaluations/application/use-cases/delete-evaluation-question.use-case.ts:19`),
y borrar la pregunta arrastra sus respuestas de quiz, igual que borrar una pregunta de un material.

## La revisión en la web

`EvaluationQuestionsDialog` (`apps/web/components/dialogs/evaluation-questions-dialog.tsx:21`) carga
las preguntas al abrirse (`apps/web/components/dialogs/evaluation-questions-dialog.tsx:49`) y ofrece
editar o eliminar por pregunta, con confirmación en un segundo paso. Editar copia la pregunta a un
borrador; la opción correcta se elige con un radio que marca una y desmarca el resto
(`apps/web/components/dialogs/evaluation-questions-dialog.tsx:82`), y guardar envía enunciado,
explicación, tema y opciones
(`apps/web/components/dialogs/evaluation-questions-dialog.tsx:92`).

Dos límites de la interfaz, a diferencia de la API: el diálogo **no** manda `type`, así que no se
puede convertir una pregunta de un tipo a otro desde la web aunque el endpoint lo permita; y el
radio de opción correcta asume una sola respuesta correcta. En una pregunta de tipo `FILL_BLANK` con
dos o más respuestas aceptadas, guardar desde el diálogo manda una sola correcta y la API la
rechaza — es una interacción que el tipo de pregunta admite pero la pantalla no. Al eliminar, el
diálogo avisa a la vista con `onQuestionsChanged` y el contador de preguntas de la fila se actualiza
sin volver a listar.
