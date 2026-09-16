# Requerimiento: generación inteligente de quiz

## Contexto

En la primera etapa del módulo de quizzes, `GenerateQuizUseCase` (`apps/api/src/modules/quizzes/`) selecciona un número fijo de preguntas (hasta 3, configurable por env) al azar dentro del alcance elegido (tema o toda la materia). Esto no tiene en cuenta el desempeño del estudiante ni qué topicProgress tiene menos estudio.

## Objetivo

Que la generación de un quiz priorice las preguntas con menos aciertos y los temas menos estudiados, y que el número de preguntas dependa de un parámetro seleccionable en pantalla **Quiz Corto** / **Quiz Largo**.

## Alcance propuesto

- Criterio de selección basado en `TopicProgress` (attempts, correctAnswers, masteryScore) y en el historial de `Answer`s por pregunta (aciertos/fallos).
- Parámetro en la vista de Quiz (Corto/Largo) que determine la cantidad de preguntas.
- Reutilizar las fronteras existentes: `QuizRepository` ya abre el alcance por topicId/subjectId; solo cambiaría la selección interna de preguntas.

## Cambios implicados

### Backend
- `modules/quizzes/application/use-cases/generate-quiz.use-case.ts`: selección por desempeño en lugar de aleatoria; orden de dificultad según aciertos/temas.
- `modules/quizzes/application/ports/quiz.repository.ts`: métodos para leer progreso por tema y métricas de aciertos por pregunta/tema.
- DTOs: campo `size`/modo (Corto/Largo) en `POST /quizzes/generate`.
- Tests de los use cases con mocks de progreso.

### Frontend
- `components/views/quiz-view.tsx`: selector Corto/Largo antes de generar.
- `lib/api.ts`: tipar el nuevo parámetro.

## Fuera de alcance (por ahora)

- Repetición espaciada completa de preguntas.
- Selección por dificultad de la pregunta (`Question.difficulty`).
- Recomendaciones/analytics transversales.

## Notas

- Coherencia con AGENTS.md: no sobreingenierizar el MVP; el cambio se apoya en módulos existentes (`TopicProgress`, `Answer`).
- El número fijo actual se mantiene mientras no exista este requerimiento implementado.