# Requerimiento: tarjetas de materia con datos reales

## Contexto

La tarjeta de materia en Inicio (`apps/web/components/ui/subject-card.tsx`) muestra tres datos que hoy son decoración del cliente:

- **Contador de materiales**: `decorateSubject` fija `materials: 0` (`apps/web/lib/subjects.ts:24`). El único escritor real es `refreshSubjectMaterialCount`, que solo se dispara desde la vista de Materiales y además es un N+1 por tema (`apps/web/hooks/use-materials.ts:62-68`).
- **Progreso**: `decorateSubject` fija `progress: 0` (`apps/web/lib/subjects.ts:23`). `TopicProgress` se calcula al enviar un intento (`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:163-208`) pero ningún endpoint lo lee.
- **Color e ícono**: `decorateSubject` asigna un patrón cíclico por índice (`apps/web/lib/subjects.ts:20`). El modelo `Subject` no tiene campos de estilo (`apps/api/prisma/schema.prisma:37-46`).

Los tres datos comparten el mismo origen: `decorateSubject` inventa valores en lugar de consumir lo que la API debería darle. Eso hace que cualquier arreglo parcial en el cliente sea un parche; la fuente de verdad tiene que estar en `GET /subjects`.

## Objetivo

Que cada tarjeta de materia muestre, desde la primera carga:

1. El número real de materiales que contiene (a través de sus temas).
2. El progreso real del estudiante en esa materia.
3. El color e ícono elegidos para la materia, persistidos en el backend.

## Alcance propuesto

### Backend

- Extender el DTO de `Subject` para devolver:
  - `materialsCount`: total de materiales de la materia, calculado con `_count` de Prisma en la misma consulta de `GET /subjects`.
  - `progress`: promedio simple de los `score` de los intentos completados de quizzes de esa materia (`QuizAttempt.score` no nulo y `completedAt` no nulo). Una materia sin intentos no muestra 0%; muestra un estado explícito de "aún no hay quizzes".
  - `icon` y `color` (o `palette`): campos persistidos en el modelo `Subject`, con un set cerrado de valores validados.
- Extender `CreateSubjectDto` y `UpdateSubjectDto` para aceptar estilo.
- Extender `SubjectRepository` y su implementación Prisma para guardar y devolver los nuevos campos.

### Frontend

- `apps/web/lib/subjects.ts`: `decorateSubject` deja de hardcodear `materials: 0`, `progress: 0` y el color cíclico; consume los campos que llegan de la API. El fallback cíclico solo aplica a materias creadas antes del cambio.
- `apps/web/components/ui/subject-card.tsx`: usa los nuevos campos y el estado "sin intentos".
- Modal "Nueva materia" (`apps/web/components/dialogs/subject-dialog.tsx`): selector de color e ícono del set permitido.
- `apps/web/lib/api.ts`: actualizar tipos `ApiSubject`, `CreateSubjectInput` y `UpdateSubjectInput`.
- Eliminar `refreshSubjectMaterialCount` y el N+1 asociado (`apps/web/hooks/use-materials.ts:60-72`).

## Fuera de alcance (por ahora)

- Editar color/ícono desde otro sitio que no sea el diálogo de crear/editar materia.
- Colores o íconos personalizados fuera del set definido.
- Desglose por tema dentro de la tarjeta.
- Insignias y Repaso (siguen siendo placeholders).
- Usar el progreso para elegir preguntas del quiz (`docs/ToDo/generacion-inteligente-quiz.md`).

## Notas

- Este ToDo unifica tres requerimientos que eran la misma falla de diseño en `decorateSubject`:
  - `docs/ToDo/contador-materiales-tarjetas.md`
  - `docs/ToDo/exponer-progreso-basico.md`
  - `docs/ToDo/color-icono-materias.md`
- La decisión sobre el porcentaje de la tarjeta (promedio simple de scores por quiz intentado) se mantiene de `docs/ToDo/exponer-progreso-basico.md`.
- Coherente con AGENTS.md: el dato se pide donde se calcula, no se replica en el cliente; validar inputs; mobile-first.
