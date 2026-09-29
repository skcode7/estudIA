# Requerimiento: exponer el progreso básico que ya se escribe

## Contexto

Al corregir un intento, `saveAttempt` recalcula `TopicProgress` en la misma transacción (`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts`): una fila por tema con `attempts`, `correctAnswers`, `totalAnswers` y `masteryScore` (media de aciertos). El progreso se agrega por el tema de cada pregunta, no por el tema del quiz.

Ese es el "progreso básico" del MVP (`wiki/components/quizzes.md`, `wiki/flows/generar-y-resolver-quiz.md`) y hoy es de solo escritura: ningún endpoint lo lee.

En la web, `decorateSubject` fija `progress: 0` y un mensaje invariable (`apps/web/lib/subjects.ts`). Las tarjetas muestran una barra que no refleja nada. La navegación ya anuncia "Progreso" (`apps/web/lib/navigation.ts`) y cae en un placeholder (`apps/web/app/page.tsx`).

## Objetivo

Que el estudiante vea el progreso real por tema y por materia (aciertos, intentos, dominio) en las tarjetas y en la vista Progreso, usando los datos que la API ya acumula.

## Alcance propuesto

- Endpoint(s) de lectura de `TopicProgress` (por tema y agregado por materia).
- Sustituir el `progress: 0` decorativo de `decorateSubject` por el dato real.
- Implementar la vista Progreso que hoy es placeholder, con lo mínimo: lista de temas y `masteryScore`.
- Definir qué mostrar cuando un tema no tiene intentos (cero, no "listo para estudiar" falso).

## Cambios implicados

### Backend
- Puerto `QuizRepository` (o un puerto de progreso) con `findProgressByTopic` / `listProgressBySubject`.
- Caso de uso + controller de lectura; DTO con `attempts`, `correctAnswers`, `totalAnswers`, `masteryScore`.
- Tests del caso de uso con progreso vacío y con varios temas.

### Frontend
- `apps/web/lib/api.ts`: tipar y consumir el endpoint.
- `apps/web/lib/subjects.ts`: dejar de hardcodear `progress: 0`.
- Vista Progreso (hoy `placeholder-view`) y tarjetas de materia.

## Fuera de alcance (por ahora)

- Insignias y Repaso (siguen siendo placeholders).
- Usar el progreso para elegir preguntas del quiz (`docs/ToDo/generacion-inteligente-quiz.md`).
- Recalcular progreso histórico si algo se borra en cascada (`docs/ToDo/ciclo-vida-preguntas-material.md` deja esas operaciones bloqueadas cuando la pregunta se usó, pero el contador ya escrito no se corrige).

## Notas

- Hallazgo del wiki: `wiki/components/quizzes.md`, `wiki/components/web.md`, `wiki/log.md` ("decisión sobre el progreso básico").
- Coherencia con AGENTS.md: el MVP sí incluye "progreso básico"; hoy se escribe y no se enseña.
- Distinto de `docs/ToDo/generacion-inteligente-quiz.md`: aquel cambia la selección de preguntas; este solo expone lo ya guardado.

## Definición del porcentaje de la tarjeta (decidido)

El `progress` de la tarjeta de materia es el **promedio simple de los porcentajes de los quizzes intentados de esa materia**: se suman los `score` de los intentos completados y se dividen por su número.

Se descarta el `masteryScore` que hoy calcula `saveAttempt` para este cálculo, por dos motivos: `masteryScore` es la media de aciertos por tema, así que un quiz de 10 preguntas pesa igual que uno de 3, mientras que el porcentaje por quiz no; y al agregar por materia habría que decidir cómo se combinan los `masteryScore` de cada tema, que es una media de medias. El promedio de los `score` no tiene esa ambigüedad.

`TopicProgress` sigue siendo útil por tema y en la vista Progreso: el cambio afecta solo al número agregado de la tarjeta.

Dos consecuencias que hay que decidir antes de codificar:

- **Qué cuenta como "intentado"**: solo intentos con `completedAt` y `score` no nulos (`QuizAttempt.score` es `Float?`). Un quiz generado y nunca respondido no debe entrar en el denominador ni contar como 0.
- **Materia sin intentos**: hoy la tarjeta muestra `0` y el mensaje "Tu materia está lista para estudiar ✨" (`apps/web/lib/subjects.ts:28`). Con un promedio sin datos, ese 0% afirma un rendimiento que no se midió. Opciones: no pintar la barra, o pintar un estado "aún no hay quizzes". Es la misma pregunta que ya planteaba el alcance de este requerimiento.

Relacionado: `docs/ToDo/listado-quizzes-con-resultado.md` (de dónde salen los `score` que se promedian; conviene que ambos lean el mismo agregado) y `docs/ToDo/contador-materiales-tarjetas.md` (el `materials: 0` de la misma tarjeta viene del mismo `decorateSubject` que el `progress: 0`).
