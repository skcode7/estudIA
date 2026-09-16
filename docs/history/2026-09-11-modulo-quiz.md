# Sesión: Módulo de Quiz (generación, respuestas y resultado)

**Fecha:** 2026-09-11
**Estado:** Completado

## Contexto

Con el procesamiento de materiales y la generación de preguntas IA terminados (6 preguntas reales en BD), el flujo del MVP quedaba corto en `realizar quiz → recibir resultado`. Las tablas `Quiz`, `QuizQuestion`, `QuizAttempt`, `Answer` y `TopicProgress` ya existían en el schema, pero sin módulo backend ni vista web (la opción de menú «Quiz» mostraba `PlaceholderView`).

Decisiones del cliente: flujo completo (generar → responder → resultado con feedback que persiste intentos y progreso); quiz por materia obligatorio con tema opcional; sin tema, un único quiz que mezcla las preguntas de toda la materia; 3 preguntas por quiz en 1ª etapa (env `QUIZ_QUESTIONS_COUNT`, default 3) con muestra aleatoria; el `startedAt` del intento lo envía el cliente al iniciar el quiz; la generación «inteligente» (menos aciertos / temas menos estudiados, modo Corto/Largo) queda registrada como requerimiento futuro.

## Cambios realizados

### Backend

- **Esquema**: `Quiz.subjectId` requerido (FK → `Subject`, onDelete Cascade) + `Quiz.topicId` opcional; `Subject.quizzes[]`. Migración `20260911161831_add_quiz_subject` aplicada.
- **Módulo Quizzes** (`src/modules/quizzes/`):
  - Port `QuizRepository` (`application/ports/quiz.repository.ts`): `findQuestionIdsByTopics`, `createQuiz` (transacción con `QuizQuestion.order`, devuelve quiz sin `isCorrect`/`explanation`), `findQuizForGrading` (con opciones correctas + topicId), `saveAttempt`.
  - `GenerateQuizUseCase`: valida materia y pertenencia del tema, resuelve alcance (tema o todos los temas de la materia), selecciona hasta `QUIZ_QUESTIONS_COUNT` preguntas al azar, `BadRequestException` si no hay temas/preguntas, título `Quiz de <materia>` / `Quiz de <materia> · <tema>`.
  - `SubmitQuizAttemptUseCase`: valida quiz y cada respuesta (pregunta del quiz, opción real, sin repetir), corrige contra `isCorrect` en BD, `score` = aciertos/total, guarda intento con `startedAt` del cliente y devuelve feedback por pregunta (`isCorrect`, `correctOptionId`, `explanation`).
  - Repo Prisma (`infrastructure/prisma-quiz.repository.ts`): `$transaction` para quiz+preguntas y para intento+answers+upsert de `TopicProgress` (`attempts`, `totalAnswers`, `correctAnswers`, `masteryScore` por tema).
  - Controller/DTOs: `POST /quizzes/generate` `{ subjectId, topicId? }` y `POST /quizzes/:id/attempts` `{ startedAt, answers[] }`; DTOs con class-validator + Swagger; el DTO de quiz baraja preguntas/opciones (la corrección siempre contra BD por ids).
  - `quizzes.module.ts` (provee `SubjectRepository`/`TopicRepository`/`QuizRepository`) y registro en `app.module.ts`.
  - Tests: `generate-quiz.use-case.spec.ts` (8) y `submit-quiz-attempt.use-case.spec.ts` (8).

### Frontend

- `lib/api.ts`: tipos `ApiQuiz`, `ApiQuizQuestion`, `ApiQuizOption`, `ApiQuizAttemptResult`, `ApiQuizAnswerFeedback` + `generateQuiz` y `submitQuizAnswers`.
- `components/views/quiz-view.tsx`: vista con 3 estados — configuración (Materia obligatoria + Tema opcional «Toda la materia» + «Generar quiz»), quiz en curso (preguntas con radio, requiere responder todas), resultado (score %, aciertos, marca correcta/seleccionada, explicación, «Nuevo quiz»). Registra `startedAt` al presentar el quiz.
- `app/page.tsx`: `QuizView` activo en la opción de menú «Quiz» (reemplaza el placeholder).

### Documentación

- `docs/ToDo/generacion-inteligente-quiz.md`: requerimiento futuro de selección por desempeño (menos aciertos / temas menos estudiados) y número variable según modo Quiz Corto/Largo.

## Validaciones

- `pnpm --filter @estudia/api`: lint OK, typecheck OK, tests 68/68 (21 archivos).
- `pnpm --filter @estudia/web`: lint OK, typecheck OK, `next build` OK.
- Smoke test real (Postgres + API con los datos existentes): quiz por tema (3 preguntas) y por materia (`topicId=null`), intento con todas correctas (score=100) y todas incorrectas (score=0, feedback con explicaciones), `startedAt` preservado, `TopicProgress` acumulando (2 intentos, mastery=0.50).

## Commits

| Hash | Descripción |
|---|---|
| 901134c | feat(backend): add quizzes module with generation and attempt grading |
| 75430cb | feat(frontend): add quiz view with subject/topic selection and result |
| a03f52b | docs(ToDo): add intelligent quiz generation requirement |

## Pendientes / próximos pasos

- Afinar el flujo de quiz (más validaciones, shapes, tasa de aciertos por pregunta).
- Generación inteligente de quiz + modo Corto/Largo — `docs/ToDo/generacion-inteligente-quiz.md`.
- Vistas de Repaso/Progreso (pueden consumir `TopicProgress`, `Answer`s y `score` del intento).
- `QuestionDifficulty` y `Question.explanation` ya viajan en el resultado; validar si `explainAnswer`/`generateHint` de IA se usan en Repaso.