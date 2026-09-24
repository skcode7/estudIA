---
title: Módulo de quizzes
type: entity
responsibility: Dueño del quiz como instantánea de preguntas, de los intentos y su corrección, y del progreso por tema que se acumula al corregir.
sources:
  - apps/api/src/modules/quizzes/quizzes.module.ts
  - apps/api/src/modules/quizzes/application/ports/quiz.repository.ts
  - apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts
  - apps/api/src/modules/quizzes/presentation/dto/quizzes.dto.ts
  - apps/api/src/modules/materials/infrastructure/prisma-material-question.repository.ts
  - apps/api/prisma/schema.prisma
synced: 36ec39f
related:
  - ../flows/generar-y-resolver-quiz.md
  - ../components/materiales.md
---

# Módulo de quizzes

Dos casos de uso (`GenerateQuizUseCase`, `SubmitQuizAttemptUseCase`), un puerto y un repositorio
Prisma. Lo interesante no está en el código del módulo sino en lo que un `Quiz` significa respecto
a las preguntas, que pertenecen a otro módulo.

## El quiz es una instantánea, no una copia

`QuizQuestion` guarda `questionId` + `order` (`apps/api/prisma/schema.prisma:143`): el quiz toma
prestadas preguntas del pool de materiales y las ordena. Las opciones y la corrección no se
copian: se leen de la pregunta cada vez que hace falta — `findQuizForGrading` las trae con su
`isCorrect` (`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:96`). Por eso
dos quizzes distintos pueden compartir preguntas y por eso el quiz no se puede editar.

La presentación se baraja al servir, no al guardar
(`apps/api/src/modules/quizzes/presentation/controllers/quizzes.controller.ts:54`): el `order` de
`QuizQuestion` es el orden de creación, no el que ve el estudiante.

## Corregir escribe progreso

`saveAttempt` crea el intento con sus respuestas **y** recalcula `TopicProgress` en la misma
transacción (`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:125`): una
fila por tema con intentos, aciertos, respuestas y `masteryScore` como media de aciertos
(`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:185`). Como las preguntas
pueden pertenecer a temas distintos en un quiz de toda la materia, el progreso se agrega por tema
de cada pregunta, no por el tema del quiz (`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:158`).

`TopicProgress` es el "progreso básico" del MVP y hoy es de solo escritura: ningún endpoint lo
lee, y la vista no muestra nada acumulado. Es el lugar donde el progreso real ya se está
guardando cuando se decida exponerlo.

## Lo frágil: reprocesar un material

Las preguntas se reemplazan en bloque al procesar un material: `replaceForMaterial` borra todas
las del material y crea las nuevas
(`apps/api/src/modules/materials/infrastructure/prisma-material-question.repository.ts:45`). Como
`QuizQuestion` y `Answer` referencian a la pregunta con `onDelete: Cascade`
(`apps/api/prisma/schema.prisma:149` y `apps/api/prisma/schema.prisma:179`), **reprocesar un
material destruye lo que sus preguntas antiguas sostenían**:

- Un quiz generado antes pierde esas preguntas en silencio y queda con menos de las que nació.
- Los intentos ya corregidos pierden las respuestas asociadas; el `score` del intento se conserva
  porque es un número ya calculado, pero su detallado se descuadra.
- `TopicProgress` no se corrige: sus contadores suman aciertos que ya no tienen respuesta detrás.

No hay nada en el código que lo impida ni que lo repare. Mientras el material se procese una vez
y no se vuelva a tocar, no se nota.

## Lo que el módulo no tiene

No hay `GET /quizzes/:id` ni listado de intentos: un quiz generado solo existe en la pantalla que
lo pidió, y si la página se recarga se pierde (la web lo reconoce y ofrece generar otro). Tampoco
hay deduplicación de intentos ni caducidad: cada envío crea un `QuizAttempt` nuevo.

El contrato de entrada está en los DTOs: un intento exige `startedAt` y un array de respuestas
validado elemento a elemento (`apps/api/src/modules/quizzes/presentation/dto/quizzes.dto.ts:39`),
que es lo que permite anidar `SubmitAnswerDto` con su par `questionId` / `selectedOptionId` sin
volver a declarar la validación en el controller.
