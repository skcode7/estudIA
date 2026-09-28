# Requerimiento: persistir el quiz en curso más allá de la pantalla

## Contexto

No hay `GET /quizzes/:id` ni listado de intentos (`wiki/components/quizzes.md`). Un quiz generado solo existe en el estado de `QuizView`. Recargar la página vuelve a Inicio porque la URL no dice dónde estás (`wiki/components/web.md`): el quiz en curso se pierde y la web ofrece generar otro.

Cada envío crea un `QuizAttempt` nuevo; no hay deduplicación ni caducidad. El `startedAt` vive en el cliente (`quiz-view.tsx`) hasta el submit.

## Objetivo

Que recargar o cambiar de vista no pierda un quiz ya generado: el estudiante puede volver a las mismas preguntas (con el mismo intento en curso) y enviar las respuestas.

## Alcance propuesto

- `GET /api/v1/quizzes/:id` que devuelva el quiz presentable (preguntas y opciones barajadas o con el orden ya servido).
- Guardar en el cliente el `quizId` (y el `startedAt`) de forma que sobreviva un refresh — p. ej. `sessionStorage` o query en la URL, sin convertir la app en un router de páginas.
- Decidir si re-servir el mismo orden de opciones (hoy se baraja en cada respuesta del controller) para no cambiar las letras al recargar.
- Evitar doble submit del mismo intento (idempotencia mínima).

## Cambios implicados

### Backend
- Puerto `QuizRepository`: lectura de quiz para presentación (sin `isCorrect` en las opciones).
- `GetQuizUseCase` + `GET /quizzes/:id`.
- Opcional: persistir el orden servido o un `QuizAttempt` en estado iniciado.
- Tests del caso de uso (404, quiz sin preguntas por reproceso).

### Frontend
- `apps/web/lib/api.ts`: `getQuiz`.
- `apps/web/components/views/quiz-view.tsx`: restaurar quiz al montar si hay id guardado.

## Fuera de alcance (por ahora)

- Historial de intentos pasados / pantalla de resultados antiguos.
- Caducidad de quizzes.
- Rutas Next.js por vista (la SPA de una página se mantiene).

## Notas

- Hallazgo del wiki: `wiki/components/quizzes.md`, `wiki/components/web.md`, `wiki/flows/generar-y-resolver-quiz.md`.
- Coherencia con AGENTS.md: mobile-first; perder el quiz al girar el teléfono o recargar es el fallo que más se nota.
- Relacionado: `docs/ToDo/reprocesar-material-preserva-historial.md` (un GET de quiz viejo puede devolver menos preguntas).
