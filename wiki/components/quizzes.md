---
title: Módulo de quizzes
type: entity
responsibility: Dueño del quiz como instantánea de preguntas, de los intentos y su corrección, y del progreso por tema que se acumula al corregir.
sources:
  - apps/api/src/modules/quizzes/quizzes.module.ts
  - apps/api/src/modules/quizzes/application/ports/quiz.repository.ts
  - apps/api/src/modules/quizzes/application/use-cases/list-quizzes.use-case.ts
  - apps/api/src/modules/quizzes/application/use-cases/get-quiz-attempt.use-case.ts
  - apps/api/src/modules/quizzes/application/use-cases/submit-quiz-attempt.use-case.ts
  - apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts
  - apps/api/src/shared/text.utils.ts
  - apps/api/src/modules/quizzes/presentation/dto/quizzes.dto.ts
  - apps/api/src/modules/materials/infrastructure/prisma-material-question.repository.ts
  - apps/api/prisma/schema.prisma
synced: 4b7f1f3
related:
  - ../flows/generar-y-resolver-quiz.md
  - ../components/materiales.md
---

# Módulo de quizzes

Cuatro casos de uso (`GenerateQuizUseCase`, `SubmitQuizAttemptUseCase`, `ListQuizzesUseCase` y
`GetQuizAttemptUseCase`), un puerto y un repositorio Prisma: generar, corregir, listar y revisar un
intento. Lo interesante no está en el código del módulo sino en lo que un `Quiz` significa respecto
a las preguntas, que pertenecen a otro módulo.

## El quiz es una instantánea, no una copia

`QuizQuestion` guarda `questionId` + `order` (`apps/api/prisma/schema.prisma:198`): el quiz toma
prestadas preguntas del pool de materiales y evaluaciones y las ordena. Las opciones y la corrección no se
copian: se leen de la pregunta cada vez que hace falta — `findQuizForGrading` las trae con su
`isCorrect` (`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:105`). Por eso
dos quizzes distintos pueden compartir preguntas y por eso el quiz no se puede editar.

La presentación se baraja al servir, no al guardar
(`apps/api/src/modules/quizzes/presentation/controllers/quizzes.controller.ts:87`): el `order` de
`QuizQuestion` es el orden de creación, no el que ve el estudiante.

## Cuántas preguntas entra: un porcentaje del pool, no un número fijo

`countForSize` (`apps/api/src/modules/quizzes/application/use-cases/generate-quiz.use-case.ts:28`)
decide cuántas preguntas se toman del alcance según la duración que elige el cliente: `SHORT` 30%,
`MEDIUM` 50%, `LONG` 70%. Redondea y acota entre 1 y el tamaño del pool, así que un pool de 2 con
`SHORT` (0.6) da 1 y nunca un quiz vacío. Es una función pura y exportada, sin configuración ni
entorno: el módulo de quizzes ya no inyecta nada por token. Antes era un número fijo
(`QUIZ_QUESTIONS_COUNT`, 3 por defecto).

`size` es la duración del quiz y no tiene nada que ver con `Question.difficulty`
(`easy|medium|hard`), que es un atributo de la pregunta y que este selector no filtra.

## Corregir respuestas para completar

Para una pregunta `FILL_BLANK`, `SubmitQuizAttemptUseCase` compara el texto escrito con todas las
opciones aceptadas (`apps/api/src/modules/quizzes/application/use-cases/submit-quiz-attempt.use-case.ts:64`).
`matchesAnyAnswer` normaliza ambos lados antes de comparar: ignora mayúsculas, tildes, puntuación
habitual y espacios repetidos, así «París», «paris» y « PARIS » coinciden
(`apps/api/src/shared/text.utils.ts:9`, `apps/api/src/shared/text.utils.ts:20`). Una respuesta vacía
siempre se marca incorrecta (`apps/api/src/shared/text.utils.ts:22`). El helper es compartido dentro
del flujo de corrección, no llama a un proveedor externo.

## Corregir escribe progreso

`saveAttempt` crea el intento con sus respuestas **y** recalcula `TopicProgress` en la misma
transacción (`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:135`): una
fila por tema con intentos, aciertos, respuestas y `masteryScore` como media de aciertos
(`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:301`). Como las preguntas
pueden pertenecer a temas distintos en un quiz de toda la materia, el progreso se agrega por tema
de cada pregunta, no por el tema del quiz (`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:274`).

`TopicProgress` es el "progreso básico" del MVP y hoy es de solo escritura: ningún endpoint lo
lee, y la vista no muestra nada acumulado. Es el lugar donde el progreso real ya se está
guardando cuando se decida exponerlo.

## Lo frágil: reprocesar un material

Las preguntas se reemplazan en bloque al procesar un material: `replaceForMaterial` borra todas
las del material y crea las nuevas
(`apps/api/src/modules/materials/infrastructure/prisma-material-question.repository.ts:47`). Como
`QuizQuestion` y `Answer` referencian a la pregunta con `onDelete: Cascade`
(`apps/api/prisma/schema.prisma:204` y `apps/api/prisma/schema.prisma:234`), **reprocesar un
material destruye lo que sus preguntas antiguas sostenían**:

- Un quiz generado antes pierde esas preguntas en silencio y queda con menos de las que nació.
- Los intentos ya corregidos pierden las respuestas asociadas; el `score` del intento se conserva
  porque es un número ya calculado, pero su detallado se descuadra.
- `TopicProgress` no se corrige: sus contadores suman aciertos que ya no tienen respuesta detrás.

No hay nada en el código que lo impida ni que lo repare. Mientras el material se procese una vez
y no se vuelva a tocar, no se nota.

La otra puerta a la misma cascada es borrar una pregunta a mano desde el diálogo de edición del
material, que se añadió en `1b39eff`: arrastra exactamente los mismos `QuizQuestion` y `Answer`.
Corregir el texto de una pregunta no tiene ese problema —solo se borran y recrean sus opciones
(`apps/api/src/modules/materials/infrastructure/prisma-material-question.repository.ts:107`)—, y
es la razón de que la web ofrezca esa vía antes que reprocesar. La política de qué hacer con el
historial sigue sin decidir: está en `docs/ToDo/ciclo-vida-preguntas-material.md`.

## El historial: un resumen y un detalle que no son el mismo DTO

`GET /quizzes?subjectId=` (`listBySubject`) devuelve, por materia, cada quiz con su tema, cuántas
preguntas tiene y el resultado del **último intento completado**
(`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:165`). El agregado es
deliberado y está escrito en el puerto: con varios intentos se lista el más reciente, no el mejor ni
el promedio (`apps/api/src/modules/quizzes/application/ports/quiz.repository.ts:99`), y un quiz sin
intento viaja con `score: null` y `attemptId: null` en vez de un `0%` que sería falso.

`GET /quizzes/:id/attempts/:attemptId` (`findAttemptDetail`) devuelve el repaso pregunta a pregunta
*con* `isCorrect` y el texto de las opciones
(`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:201`). La asimetría con el
listado es intencional: el listado es un resumen que no revela respuestas, y el detalle es la
revisión de un intento ya enviado — la misma información que devuelve el `POST` de intentos. Es la
frontera que `docs/ToDo/roles-tutor-alumno.md` quiere dejar explícita.

Dos decisiones del repositorio se ven en los bordes. El detalle responde `null` —y el caso de uso un
`404`— si el intento pertenece a otro quiz o si está incompleto (`attempt.quizId !== quizId`, con
`score` o `completedAt` nulos, `apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:229`);
y las respuestas se ordenan por el `order` del `QuizQuestion`
(`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:240`) para que el repaso
siga el orden que vio el estudiante, no el de inserción.

## Lo que el módulo no tiene

No hay `GET /quizzes/:id`: el quiz **vivo** (sus preguntas, sin intento) sigue existiendo solo en la
pantalla que lo pidió, y al recargar se pierde (la web lo reconoce y ofrece generar otro). Lo que
sí hay desde `6191d10` es el historial de intentos ya enviados, no el del quiz en curso; por eso
`docs/ToDo/persistir-quiz-en-curso.md` sigue abierto aunque el requerimiento del historial ya esté
implementado. Tampoco hay deduplicación de intentos ni caducidad: cada envío crea un `QuizAttempt`
nuevo.

El contrato de entrada está en los DTOs: un intento exige `startedAt` y un array de respuestas
validado elemento a elemento (`apps/api/src/modules/quizzes/presentation/dto/quizzes.dto.ts:89`),
que es lo que permite anidar `SubmitAnswerDto` con su par `questionId` / `selectedOptionId` sin
volver a declarar la validación en el controller.
