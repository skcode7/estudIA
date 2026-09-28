# Requerimiento: pistas y explicaciones de respuesta en el quiz

## Contexto

`AIProvider` declara `explainAnswer` y `generateHint` (`apps/api/src/modules/ai/application/ports/ai-provider.ts`) y DeepSeek los implementa (`apps/api/src/infrastructure/ai/deepseek/deepseek.provider.ts`), pero ningún caso de uso los invoca: solo aparecen en los mocks de los tests (`wiki/components/ia.md`).

No confundir con `Question.explanation`, que sí se genera al procesar el material y se muestra en el feedback del intento (`SubmitQuizAttemptUseCase` + `quiz-view.tsx`). Las capacidades sin uso son:

- **Pista** mientras el estudiante aún no envió el quiz.
- **Explicación bajo demanda** de por qué una opción es correcta o no, distinta del texto estático guardado en la pregunta.

## Objetivo

Que el estudiante pueda pedir una pista antes de responder y, tras el resultado, una explicación generada si la `explanation` estática no basta, reutilizando los métodos que el puerto ya tiene.

## Alcance propuesto

- Caso de uso que llame a `generateHint` para una pregunta de un quiz en curso (sin revelar la opción correcta).
- Caso de uso opcional que llame a `explainAnswer` en el resultado, acotado a la pregunta/opción del intento.
- Controles en la vista Quiz: "Pista" durante el intento y, si aplica, "Explicar" en el resultado.
- Seguir el patrón Controller → Use Case → `AIProvider`; no llamar al proveedor desde el controller.

## Cambios implicados

### Backend
- Nuevos casos de uso en `apps/api/src/modules/quizzes/` (o materials, si la pista no exige un quiz).
- Controller + DTOs; validar que la pregunta pertenece al quiz.
- Tests con mock de `AIProvider`.

### Frontend
- `apps/web/components/views/quiz-view.tsx`: acciones de pista / explicación.
- `apps/web/lib/api.ts`: nuevos métodos.

## Fuera de alcance (por ahora)

- Streaming de la respuesta del modelo.
- Pistas que gasten un "crédito" o afecten la puntuación.
- Cambiar el puerto `AIProvider` (ya declara ambos métodos).

## Notas

- Hallazgo del wiki: `wiki/components/ia.md`, `wiki/log.md`.
- Coherencia con AGENTS.md: nunca llamar DeepSeek desde controllers o casos de uso; el puerto ya existe.
- El coste de IA se paga en el momento de la pista, no al procesar el material.
