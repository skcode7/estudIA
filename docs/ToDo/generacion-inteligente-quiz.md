# Requerimiento: generación inteligente de quiz (selección por desempeño)

## Contexto

`GenerateQuizUseCase` baraja los ids del alcance y corta sin mirar nada más:

```ts
// apps/api/src/modules/quizzes/application/use-cases/generate-quiz.use-case.ts
const selectedIds = shuffle(questionIds).slice(0, countFor(input.size, questionIds.length));
```

Lo único que decide qué preguntas entran es el azar. El student's desempeño no participa: un tema que
se ha fallado ocho veces y uno que se domina igual se sortearon con la misma probabilidad.

Los datos para hacerlo mejor ya existen y se están escribiendo sin que nadie los lea:

- `TopicProgress` (`apps/api/prisma/schema.prisma`) guarda `attempts`, `correctAnswers` y
  `masteryScore` por tema. `SubmitQuizAttemptUseCase` lo actualiza en cada intento; ninguna lectura lo
  consulta.
- `Answer` guarda `isCorrect` por pregunta de cada intento, así que el histórico por pregunta es
  reconstruible sin datos nuevos.

El alcance ya está resuelto: `QuizRepository.findQuestionIdsByTopics(topicIds)` devuelve **todas** las
preguntas del alcance elegido, y el selector de duración ya las recorta. Este requerimiento no cambia
cuántas preguntas hay, sino cuáles.

## Objetivo

Que la selección de preguntas deje de ser aleatoria y priorice lo que el estudiante menos domina: las
preguntas que más ha fallado y los temas con menos estudio, manteniendo la aleatoriedad dentro de cada
grupo para que dos quizzes seguidos no sean idénticos.

## Alcance propuesto

- Ordenar el pool por una señal de necesidad de estudio, no por azar puro. La señal mínima es
  `TopicProgress.masteryScore` ascendente: lo menos dominado primero.
- Desempate dentro de un mismo `masteryScore` por el histórico de la pregunta (`Answer.isCorrect`),
  de modo que las preguntas ya falladas repetidamente se reinforce.
- Un salto deliberado de aleatoriedad: partir de ordenarlos todos y barajar dentro de franjas, en vez
  de cortar los primeros N de una lista ordenada. Si no, dos quizzes consecutivos sobre el mismo tema
  salen idénticos, y eso es peor que seleccionar al azar.
- El selector de duración y el porcentaje sobre el pool **no cambian**: este requerimiento elige
  *cuáles*, el otro elige *cuántas*.

## Cambios implicados

### Backend
- `QuizRepository`: método para leer el progreso del alcance (los `masteryScore` de los `topicIds` de la
  petición) y el histórico de aciertos por pregunta. Hoy el puerto solo aporta ids
  (`quiz.repository.ts:79`), así que hacen falta métodos nuevos, no solo cambiar la selección.
- `GenerateQuizUseCase`: la selección pasa de `shuffle(...).slice(...)` a ordenar por necesidad de
  estudio. La regla de orden es una **función pura testeable** en el mismo archivo que el redondeo del
  selector, no una cadena de comparaciones dentro de `execute`.
- Tests: el orden respeta el `masteryScore`; el desempate por histórico funciona; dos generaciones
  seguidas sobre el mismo estado **no** devuelven la misma lista.

### Frontend
- Sin cambios: el selector de duración y el mensaje de resultado no se tocan.

## Fuera de alcance (por ahora)

- **Seleccionar por dificultad** de la pregunta (`Question.difficulty`, `easy|medium|hard`). Es un
  atributo que hoy nadie lee, y mezclarlo con "lo que el estudiante falla" son dos criterios
  distintos: una pregunta puede ser fácil y aun así fallarla siempre.
- Mostrar el tamaño del pool antes de generar («3 de 10»). El conteo es calculable con la misma
  consulta que este requerimiento necesita, así que conviene no duplicarla; el mensaje de resultado ya
  dice cuántas preguntas trae el quiz.
- Ponderar el peso de cada pregunta más allá del acierto o el fallo.
- Repetición espaciada completa.

## Notas

- Coherente con AGENTS.md: la selección sigue siendo una decisión de aplicación y el repositorio solo
  aporta datos. Si al final hay que ordenar en Prisma, el repositorio puede devolver el pool ya
  ordenado y el caso de uso conserva la regla, pero la frontera no se cruza.
- La Difficulty ya existe como atributo (`schema.prisma`), pero el esquema no la indexa. Si algún día
  se filtra por ella, ese índice será necesario; hoy no se toca.
- El ya resuelto `docs/ToDo/tarjetas-materia-datos-reales.md` era el gemelo de este requerimiento en la
  UI: exponía `TopicProgress` en las tarjetas. Conviene que ambos lean el mismo agregado.
- Precedente: `docs/ToDo/ciclo-vida-preguntas-material.md` acota el pool antes. Si el pool se
  reduce a lo que sigue en estudio, seleccionar por desempeño tiene mucho menos que resolver.
