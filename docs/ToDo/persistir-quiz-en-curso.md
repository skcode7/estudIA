# Requerimiento: continuar y persistir el progreso de quizzes sin responder

## Contexto

No hay `GET /quizzes/:id` ni listado de intentos (`wiki/components/quizzes.md`). Un quiz generado solo existe en el estado de `QuizView` (`apps/web/components/views/quiz-view.tsx`: `quiz`, `startedAt` y `answers`). Recargar la página vuelve a Inicio porque la URL no dice dónde estás (`wiki/components/web.md`): el quiz en curso se pierde y la web ofrece generar otro. El usuario reportó perder a mitad de camino un quiz largo (46 preguntas) al recargar.

El historial ya muestra quizzes que no tienen intento como "Sin responder", pero la fila está deshabilitada (`apps/web/components/views/quiz-history-panel.tsx:40-68`); no hay una acción para retomarlos. Cada envío crea un `QuizAttempt` nuevo; no hay deduplicación ni caducidad. El `startedAt` y las respuestas viven solo en el estado del cliente hasta el submit.

## Objetivo

Que un quiz sin responder pueda retomarse desde el historial y que recargar la página no pierda las respuestas ya seleccionadas. El estudiante debe volver a las mismas preguntas, conservar el orden presentado y poder completar y enviar ese mismo intento.

## Alcance propuesto

- `GET /api/v1/quizzes/:id` que devuelva el quiz presentable (preguntas y opciones barajadas o con el orden ya servido). La acción "Continuar" del historial debe cargar el quiz seleccionado, incluso si aún no tiene intento.
- Habilitar en `QuizHistoryPanel` una acción explícita "Continuar" para los quizzes `attemptId === null`; los quizzes respondidos mantienen su acción actual de ver resultado.
- Persistir en `localStorage`, por `quizId`, el identificador del quiz, `startedAt` y las respuestas seleccionadas (`questionId` → `optionId`). Al volver a entrar o recargar, restaurar el quiz y el progreso guardado.
- Mantener el progreso parcial aunque el usuario salga a otra vista y luego lo retome desde "Continuar". El guardado debe actualizarse al cambiar una respuesta.
- Al completar y enviar exitosamente, eliminar de `localStorage` el borrador de ese quiz; si el envío falla, conservarlo para reintentar.
- Decidir cómo re-servir el mismo orden de preguntas y opciones (hoy se baraja en cada respuesta del controller) para no cambiar las letras al recargar o continuar.
- Evitar doble submit del mismo intento (idempotencia mínima).

## Cambios implicados

### Backend
- Puerto `QuizRepository`: lectura de quiz para presentación (sin `isCorrect` en las opciones).
- `GetQuizUseCase` + `GET /quizzes/:id`.
- Resolver si basta guardar el intento en curso en el navegador o si conviene persistir un `QuizAttempt` en estado iniciado para asegurar identidad/idempotencia en servidor. No exponer respuestas correctas antes del submit.
- Tests del caso de uso (404, quiz sin preguntas por reproceso).

### Frontend
- `apps/web/lib/api.ts`: `getQuiz`.
- `apps/web/components/views/quiz-history-panel.tsx`: habilitar "Continuar" para quizzes sin intento y distinguir la acción de ver resultado para quizzes respondidos.
- `apps/web/components/views/quiz-view.tsx`: restaurar quiz, `startedAt` y respuestas desde `localStorage`; guardar cambios de respuestas; cargar el quiz seleccionado desde historial; borrar el borrador tras envío exitoso.
- Manejar datos locales inválidos o incompatibles con el quiz (p. ej. pregunta/opción ya no disponible) sin bloquear la vista: descartarlos o conservar solo respuestas que sigan siendo válidas.

## Fuera de alcance (por ahora)

- Historial de intentos pasados / pantalla de resultados antiguos (el listado existente permanece).
- Sincronización de progreso entre dispositivos o navegadores: `localStorage` es local al navegador.
- Caducidad automática o limpieza de quizzes antiguos no respondidos.
- Rutas Next.js por vista (la SPA de una página se mantiene).

## Notas

- Hallazgo del wiki: `wiki/components/quizzes.md`, `wiki/components/web.md`, `wiki/flows/generar-y-resolver-quiz.md`.
- Coherencia con AGENTS.md: mobile-first; perder el quiz al girar el teléfono o recargar es el fallo que más se nota.
- Los datos guardados son solo respuestas elegidas, nunca la corrección (`isCorrect`) ni datos sensibles. `localStorage` debe tolerar JSON corrupto, falta de cuota y quizzes que ya no se puedan recuperar.
- El paginado del historial (10 por página) y el botón "Generar quiz" en el header ya están implementados en `quiz-history-panel.tsx` y `quiz-view.tsx`; este ToDo cubre la acción "Continuar".
- Relacionado: `docs/ToDo/ciclo-vida-preguntas-material.md` (un GET de quiz viejo puede devolver menos preguntas si algo se borró en cascada; ese ToDo propone bloquear esas operaciones).
