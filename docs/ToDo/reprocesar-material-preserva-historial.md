# Requerimiento: reprocesar un material sin destruir el historial de quizzes

## Contexto

`replaceForMaterial` borra todas las preguntas de un material y crea las nuevas (`apps/api/src/modules/materials/infrastructure/prisma-material-question.repository.ts`). `QuizQuestion` y `Answer` referencian esas preguntas con `onDelete: Cascade` (`apps/api/prisma/schema.prisma`, modelos `QuizQuestion` y `Answer`).

El wiki (`wiki/components/quizzes.md`) documenta el efecto real:

- Un quiz generado antes pierde esas preguntas en silencio y queda con menos de las que nació.
- Los intentos ya corregidos pierden las respuestas asociadas; el `score` del intento se conserva como número, pero el detalle se descuadra.
- `TopicProgress` no se recalcula: sus contadores suman aciertos que ya no tienen respuesta detrás.

Mientras el material se procese una sola vez no se nota. En cuanto el usuario reprocesa (o edita y vuelve a procesar, la única forma coherente de corregir contenido según `wiki/components/materiales.md`), el historial de estudio se corrompe.

## Objetivo

Que reprocesar un material genere preguntas nuevas sin borrar el rastro de quizzes e intentos ya resueltos, y que el progreso por tema siga siendo coherente con lo que el estudiante ya contestó.

## Alcance propuesto

- Dejar de tratar las preguntas como un conjunto reemplazable que arrastra quizzes e intentos.
- Conservar las preguntas ya usadas en un quiz (o copiar el enunciado/opciones al quiz en el momento de generarlo) para que un intento histórico se pueda reconsultar.
- Definir qué ocurre con `TopicProgress` al reprocesar: no dejar contadores huérfanos.
- Si un quiz en curso pierde preguntas, fallar de forma explícita o regenerar, nunca recortar en silencio.

## Cambios implicados

### Backend
- `apps/api/src/modules/materials/infrastructure/prisma-material-question.repository.ts` — `replaceForMaterial`: dejar de borrar en cascada las preguntas referenciadas por quizzes, o snapshotear el quiz.
- `apps/api/prisma/schema.prisma` — revisar `onDelete: Cascade` de `QuizQuestion` y `Answer`; posible snapshot de enunciado/opciones en el quiz.
- `apps/api/src/modules/quizzes/` — reconsultar un intento no debe depender de preguntas que ya no existen.
- Tests de `ProcessMaterialUseCase` y de corrección de intento con material reprocesado.

### Frontend
- Sin cambios de UI salvo, si aplica, un aviso al reprocesar de que las preguntas del pool se actualizan sin perder intentos pasados.

## Fuera de alcance (por ahora)

- Historial visible de intentos en la web (ver `docs/ToDo/persistir-quiz-en-curso.md`).
- Selección inteligente de preguntas (`docs/ToDo/generacion-inteligente-quiz.md`).

## Notas

- Hallazgo del wiki: `wiki/components/quizzes.md` y `wiki/log.md` (siembra 2026-09-24).
- Coherencia con AGENTS.md: manejar errores explícitamente; el recorte silencioso de un quiz es un fallo de integridad, no un detalle de Prisma.
- Relacionado: `docs/ToDo/marcar-material-desactualizado.md` (editar sin reprocesar) y `docs/ToDo/exponer-progreso-basico.md` (el progreso escrito hoy puede quedar incoherente).
