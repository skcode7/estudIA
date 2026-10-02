---
title: Generar y resolver un quiz
type: flow
responsibility: Cómo se arma un quiz desde las preguntas ya generadas, cómo se resuelve y cómo se puntúa el intento, desde la vista Quiz hasta los casos de uso de quizzes.
trigger: El usuario pulsa "Generar quiz" en la vista Quiz
sources:
  - apps/web/components/views/quiz-view.tsx
  - apps/api/src/modules/quizzes/presentation/controllers/quizzes.controller.ts
  - apps/api/src/modules/quizzes/application/use-cases/generate-quiz.use-case.ts
  - apps/api/src/modules/quizzes/application/use-cases/submit-quiz-attempt.use-case.ts
  - apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts
  - apps/api/src/modules/quizzes/quizzes.module.ts
  - apps/api/src/shared/random.utils.ts
synced: 36ec39f
related:
  - ./procesamiento-de-material.md
  - ../components/quizzes.md
---

# Generar y resolver un quiz

Lo que este flujo hace y lo que no: **generar un quiz no llama a la IA**. Las preguntas nacen
cuando se procesa un material (ver [Procesamiento de un material](./procesamiento-de-material.md));
generar un quiz es *seleccionar* entre esas preguntas y armar un intento. Esto es a propósito: el
quiz se genera en milisegundos y el coste de IA ya se pagó al procesar.

## 1 · Generar: selección aleatoria

La vista pide materia, tema y duración
(`apps/web/components/views/quiz-view.tsx:144`); al pulsar "Generar quiz" llama a
`POST /api/v1/quizzes/generate` (`apps/web/components/views/quiz-view.tsx:78`) y guarda el
instante de inicio del intento (`apps/web/components/views/quiz-view.tsx:83`), que es lo que
después permite medir cuánto tardó el estudiante.

`GenerateQuizUseCase` decide de dónde salen las preguntas:

- **Con tema**: el tema debe existir y pertenecer a la materia; si no, `404` o `400`
  (`apps/api/src/modules/quizzes/application/use-cases/generate-quiz.use-case.ts:56`).
- **Sin tema**: se usan todos los temas de la materia; una materia sin temas es un `400` con un
  mensaje que dice qué hacer (`apps/api/src/modules/quizzes/application/use-cases/generate-quiz.use-case.ts:54`).
- **Sin preguntas**: si ningún tema tiene preguntas generadas, el `400` dice "Procesa materiales
  con IA para generarlas" (`apps/api/src/modules/quizzes/application/use-cases/generate-quiz.use-case.ts:74`).
  Es el error más común al empezar: tener materiales sin procesar no basta.

De las preguntas disponibles se baraja el pool entero y se recorta según la duración elegida
(`SHORT` 30%, `MEDIUM` 50%, `LONG` 70%): la cuenta la saca `countForSize` en
`apps/api/src/modules/quizzes/application/use-cases/generate-quiz.use-case.ts:28`, con un suelo de
1 pregunta y sin poder superar el pool. Antes era un número fijo (`QUIZ_QUESTIONS_COUNT`, 3 por
defecto) que hoy ya no existe. El quiz se guarda con esos ids
(`apps/api/src/modules/quizzes/application/use-cases/generate-quiz.use-case.ts:79`).
`topicId: null` significa "quiz de toda la materia".

La duración se elige en un tercer select junto a Materia y Tema
(`apps/web/components/views/quiz-view.tsx:185`), etiquetado Corta / Media / Larga y en `MEDIUM` por
defecto, que es justo lo que la API aplica cuando `size` no viene. La web no muestra el porcentaje
porque depende de cuántas preguntas hay en el alcance, y eso no se sabe antes de generar.

## 2 · Presentar: el orden lo pone el DTO

El mismo `shuffle` compartido (`apps/api/src/shared/random.utils.ts:1`) se aplica dos veces al
montar la respuesta: a las preguntas y a las opciones de cada pregunta
(`apps/api/src/modules/quizzes/presentation/controllers/quizzes.controller.ts:59`). Ninguno de los
dos órdenes se guarda: cada petición puede presentar el mismo quiz de forma distinta, y el
estudiante no puede memorizar "la b es la buena".

Las preguntas con imagen llevan una URL relativa construida con el material de origen
(`apps/api/src/modules/quizzes/presentation/controllers/quizzes.controller.ts:75`); la web la
resuelve contra la API con `assetUrl` y la pinta con un `<img>` plano
(`apps/web/components/views/quiz-view.tsx:251`), sin optimizador de Next.

## 3 · Responder: la web exige completitud, la API la revalida

La vista solo habilita "Enviar respuestas" cuando **todas** las preguntas tienen opción elegida
(`apps/web/components/views/quiz-view.tsx:94`) y vuelve a comprobarlo antes de enviar
(`apps/web/components/views/quiz-view.tsx:100`). La API no confía en eso:
`SubmitQuizAttemptUseCase` exige al menos una respuesta y exactamente una por pregunta
(`apps/api/src/modules/quizzes/application/use-cases/submit-quiz-attempt.use-case.ts:43`), rechaza
preguntas ajenas al quiz o repetidas
(`apps/api/src/modules/quizzes/application/use-cases/submit-quiz-attempt.use-case.ts:53`) y
opciones que no pertenecen a su pregunta
(`apps/api/src/modules/quizzes/application/use-cases/submit-quiz-attempt.use-case.ts:59`). Cada
incumplimiento es un `400` con el caso concreto en el mensaje.

## 4 · Corregir y responder

La corrección es local: `option.isCorrect` ya está en la base de datos, no se pregunta a ningún
modelo. El score es el porcentaje de aciertos redondeado
(`apps/api/src/modules/quizzes/application/use-cases/submit-quiz-attempt.use-case.ts:74`) y el
intento se guarda con sus respuestas y su `startedAt`
(`apps/api/src/modules/quizzes/application/use-cases/submit-quiz-attempt.use-case.ts:77`).

En la misma transacción que guarda el intento se recalcula el **progreso por tema**
(`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:142`): una fila
`TopicProgress` por tema con `attempts`, `correctAnswers`, `totalAnswers` y un `masteryScore` que
es la media de aciertos (`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:185`).
Es el "progreso básico" del MVP, y hoy es de escritura: ningún endpoint lo lee ni lo muestra.

La respuesta trae un *feedback* por pregunta — la correcta, la elegida y la explicación que generó
la IA al procesar el material
(`apps/api/src/modules/quizzes/application/use-cases/submit-quiz-attempt.use-case.ts:85`) — y la
vista de resultado las repasa una a una marcando correcta/incorrecta, resaltando la opción correcta
y mostrando la explicación (`apps/web/components/views/quiz-view.tsx:369`).

## Lo que este flujo deja fuera

No hay reintentos de un mismo quiz: cada "Generar quiz" crea un registro nuevo y los intentos se
acumulan sin más. La corrección no acepta respuestas parciales, y no hay ningún historial visible
para el estudiante más allá del resultado de la pantalla: el progreso por tema se acumula en la
base de datos pero todavía no sale a ninguna parte.
