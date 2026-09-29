# Requerimiento: selector de nivel en la pantalla de quiz

## Contexto

El quiz toma siempre un número fijo de preguntas, venga o venga el pool: `GenerateQuizUseCase` baraja los ids del alcance y corta con `.slice(0, this.config.questionsCount)` (`apps/api/src/modules/quizzes/application/use-cases/generate-quiz.use-case.ts:65`). El valor sale de `QUIZ_QUESTIONS_COUNT`, con default 3 (`apps/api/src/modules/quizzes/quizzes.module.ts:25`).

El efecto es que el tamaño del quiz no depende del material: una materia con 60 preguntas generadas da el mismo quiz que una con 3. El estudiante no puede elegir cuánto quiere estudiar, y cuando hay muchas preguntas el 3 es arbitrario.

El pool sí está disponible y es correcto: `findQuestionIdsByTopics(topicIds)` (`:58`) devuelve **todas** las preguntas del alcance elegido, así que el porcentaje es calculable sin consultas nuevas.

Ojo al nombre: el selector propuesto se llama «nivel» y escala la **cantidad**, pero `Question.difficulty` ya existe como atributo por pregunta con valores `easy | medium | hard` (`apps/api/prisma/schema.prisma:97`). Son dos cosas distintas y no deben confundirse; `docs/ToDo/generacion-inteligente-quiz.md:32` deja la selección por dificultad explícitamente fuera de alcance.

## Objetivo

Que el estudiante elija antes de generar cuán largo quiere el quiz, y que ese número se proportione al material disponible en vez de estar clavado en 3.

## Alcance propuesto

- Selector de nivel en la pantalla Quiz, junto a los selectores de materia y tema: **Fácil 30%**, **Intermedio 50%**, **Avanzado 70%** de las preguntas disponibles en el alcance.
- Regla de redondeo con suelo y techo: `count = clamp(round(pool × ratio), 1, pool)`. El suelo en 1 importa: con un pool de 2, el 30% da 0.6, y un quiz de cero preguntas es un resultado inválido, no uno fácil.
- El porcentaje se calcula sobre el pool del alcance, no sobre el total de la materia, para que elegir un tema cambie el resultado de forma predecible.
- El mensaje de la pantalla de resultado dice cuántas preguntas trae el quiz y cuántas había disponibles, para que el porcentaje sea legible y no parezca arbitrario.

## Cambios implicados

### Backend
- `generate-quiz.use-case.ts`: `GenerateQuizInput` gana el nivel, y la selección pasa a cortar con el `count` derivado del pool en vez del config fijo. El redondeo va en una función pura testeable, no en línea dentro del `execute`.
- `quizzes.module.ts`: el `GENERATE_QUIZ_CONFIG` pasa a mapear nivel → ratio, o queda solo como tope máximo defensivo. Decidir cuál de las dos cosas y no dejar ambas.
- DTO `GenerateQuizDto` (`presentation/dto/quizzes.dto.ts`): campo de nivel con validación por enum, con class-validator como el resto de DTOs.
- Tests: pool grande, pool de 1, pool de 2 en nivel fácil (el caso del suelo) y nivel avanzado con pool menor que el porcentaje.

### Frontend
- `lib/api.ts`: el nivel viaja en el body de `generateQuiz`.
- `components/views/quiz-view.tsx`: el selector, antes del CTA de generar.
- `components/ui/state-panels.tsx` y el texto de la vista: cuántas preguntas hay disponibles en el alcance, para que el porcentaje sea entendible antes de confirmar.

## Fuera de alcance (por ahora)

- Seleccionar **por** dificultad de la pregunta (filtrar `easy`/`medium`/`hard` en vez de escalar la cantidad). Es lo que `docs/ToDo/generacion-inteligente-quiz.md:32` reserva.
- Selección por desempeño del estudiante (priorizar lo que más se falla), que es el cuerpo real de `docs/ToDo/generacion-inteligente-quiz.md`.
- Ponderar el porcentaje por el peso de cada pregunta.
- Un cuarto nivel, o un porcentaje libre que el usuario escriba.

## Notas

- El solapamiento con `docs/ToDo/generacion-inteligente-quiz.md` es real: aquel propone un selector «Quiz Corto / Quiz Largo» para el mismo problema. Aquí se sustituye por tres niveles proporcionales al pool, que es más informativo —el porcentaje es calculable de antemano— y deja menos margen a la arbitrariedad que un número fijo mayor. Quien implemente uno debe decidir si absorbe el otro.
- Coherente con AGENTS.md: la selección sigue siendo una decisión de aplicación y el repositorio solo aporta ids. El redondeo es una función pura, sin ramificaciones dentro del caso de uso.
- `AI_QUESTIONS_PER_MATERIAL` (módulo de materiales) y `QUIZ_QUESTIONS_COUNT` (módulo de quizzes) son variables distintas que además valen 3 por defecto, lo que hace fácil confundirlas al leer la config. Conviene no reutilizar la misma palabra en la UI para las dos.
- Para mostrar «3 de 10» antes de generar hace falta exponer el tamaño del pool, y hoy no hay endpoint de conteo. Ese dato se calcula en el mismo repositorio que `docs/ToDo/listado-quizzes-con-resultado.md` necesita, así que conviene no duplicar la consulta.
