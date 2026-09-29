# Requerimiento: historial de quizzes con porcentaje y detalle

## Contexto

`QuizzesController` solo expone dos rutas: `POST /quizzes/generate` y `POST /quizzes/:id/attempts` (`apps/api/src/modules/quizzes/presentation/controllers/quizzes.controller.ts:22-41`). No hay listado ni detalle, así que **un quiz que ya se respondió es invisible**.

`QuizView` es una máquina de estados de un solo intento: generar → responder → ver resultado → "Nuevo quiz" (`apps/web/components/views/quiz-view.tsx:72-125`). El resultado se pinta y se pierde: `handleNewQuiz` (`:120-125`) limpia el estado, y al recargar la página la app vuelve a Inicio porque no hay rutas por vista.

Los datos sí existen: `Quiz` tiene `title`, `subjectId`, `topicId` y timestamps (`apps/api/prisma/schema.prisma:126-140`), y `QuizAttempt` guarda `score` con `completedAt`, ambos nullable (`apps/api/prisma/schema.prisma:156-167`). Se están escribiendo y no se están leyendo, igual que el progreso.

Dos detalles del modelo que el diseño tiene que respetar:

1. `QuizAttempt.score` es `Float?` y `completedAt` es nullable: un quiz generado y nunca respondido **no tiene porcentaje**. Mostrar `0%` ahí sería mentir — es un quiz sin intento, no uno fallado.
2. `Answer` guarda `selectedOptionId` e `isCorrect` por pregunta, así que el detalle por pregunta es reconstruible sin datos nuevos.

## Objetivo

Que en la pantalla Quiz haya un listado de los quizzes ya jugados con su porcentaje, un popup con el detalle pregunta a pregunta, y un CTA para generar uno nuevo — sin perder el flujo actual de responder.

## Alcance propuesto

- Listado de quizzes por materia, más recientes primero, con título, fecha, porcentaje y número de preguntas.
- Porcentaje sourced del intento. **Decidir cuál cuando hay varios intentos del mismo quiz** (último, mejor o promedio) y dejarlo escrito: es la decisión que más se nota si se cambia después.
- Estado explícito para el quiz sin intento terminado, distinto de `0%`.
- Popup de detalle con el repaso por pregunta: enunciado, opciones, la marcada, la correcta y la explicación. Es la misma forma que `QuizAnswerFeedbackDto` ya devuelve tras enviar, así que el DTO se reutiliza en vez de inventar otro.
- El CTA de generar nuevo conserva el formulario actual (materia, tema y el nivel de `docs/ToDo/selector-nivel-quiz.md`).

## Cambios implicados

### Backend
- `QuizRepository`: método de listado por materia con el agregado de intentos, y uno de detalle de un intento.
- `ListQuizzesUseCase` + `GET /quizzes?subjectId=`: quizzes con su porcentaje y contadores, **sin** `isCorrect` en las opciones.
- `GetQuizAttemptUseCase` + `GET /quizzes/:id/attempts/:attemptId` (o `GET /quizzes/attempts/:attemptId`): el detalle. Devuelve `isCorrect` y `explanation` a propósito, porque es la revisión posterior a un intento ya enviado.
- DTOs de lista y de detalle, con `score: number | null` explícito para el caso sin intento.
- Tests: quiz sin intentos, quiz con varios intentos, detalle de un intento ajeno a otro quiz (el mismo `404` explícito que ya usan los casos de uso de preguntas).

### Frontend
- `lib/api.ts`: `listQuizzes`, `getQuizAttempt` y sus tipos.
- `components/views/quiz-view.tsx`: separar el listado del flujo de respuesta, que hoy comparte estado en un solo componente.
- `components/dialogs/`: popup nuevo de detalle, siguiendo el `Dialog` base y el patrón de `material-delete-dialog`.
- Decidir qué hace el listado al elegir un quiz ya respondido (revisar el detalle) frente a volver a jugarlo.

## Fuera de alcance (por ahora)

- Rejugar un quiz ya respondido creando un intento nuevo sobre las mismas preguntas.
- Comparar dos intentos del mismo quiz.
- Exportar el historial.
- Rutas Next.js por vista para que un quiz sea enlazable.

## Notas

- `docs/ToDo/persistir-quiz-en-curso.md` deja esto explícitamente fuera de alcance en su línea 34 ("Historial de intentos pasados / pantalla de resultados antiguos") y resuelve el problema opuesto —que el quiz **en curso** sobreviva a un refresh. Ambos tocan `QuizRepository` y el estado de `QuizView`, así que conviene no implementarlos a la vez sin coordinate: el primero pide `GET /quizzes/:id` para el quiz vivo, este pide el listado del pasado.
- Coherente con AGENTS.md: es lectura de lo que ya se escribe, sin infraestructura nueva. Ningún caso de uso nuevo necesita IA ni storage.
- La asimetría entre el DTO del quiz (`toQuizDto`, sin `isCorrect`) y el del detalle (con `isCorrect`) es intencionada y conviene documentarla en el código, no solo aquí: es la frontera que `docs/ToDo/roles-tutor-alumno.md` quiere hacer explícita.
- El porcentaje que se liste aquí es el mismo input del promedio de las tarjetas del Inicio (`docs/ToDo/exponer-progreso-basico.md`). Si ese promedio se define sobre quizzes, conviene que ambos lean el mismo agregado y no dos fórmulas parecidas.
- `Answer.answerText` existe en el modelo y no se usa; el detalle no debería depender de él.
