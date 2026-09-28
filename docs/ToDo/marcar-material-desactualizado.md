# Requerimiento: detectar material editado sin reprocesar

## Contexto

`UpdateMaterialUseCase` hace `PATCH` de título y/o contenido y recalcula `questionCount`, pero no dispara procesamiento (`apps/api/src/modules/materials/application/use-cases/update-material.use-case.ts`). Las preguntas siguen correspondiendo al texto de cuando se procesó, y nada lo detecta (`wiki/components/materiales.md`).

Un material `COMPLETED` editado es una fuente de preguntas desactualizadas. Reprocesar las regenera, pero hoy eso destruye el historial de quizzes (`docs/ToDo/reprocesar-material-preserva-historial.md`). La única forma coherente de corregir es editar y volver a procesar, sabiendo lo que eso borra — y la UI no avisa.

## Objetivo

Que el usuario vea que el contenido ya no coincide con las preguntas generadas, y que pueda reprocesar de forma consciente (o que el sistema lo ofrezca) en lugar de seguir generando quizzes sobre un texto viejo.

## Alcance propuesto

- Marca de desfase (campo o convención: p. ej. `contentUpdatedAt` vs `processedAt`, o `processingStatus` distinto de "al día").
- Al editar `content` de un material `COMPLETED`, pasar a un estado visible (pendiente de reprocesar) sin borrar las preguntas todavía.
- En la UI, badge o aviso junto al material y, si se genera un quiz, no usar en silencio preguntas de un material marcado como desfasado — o avisar.

## Cambios implicados

### Backend
- Modelo `Material` / puerto: timestamp de último procesamiento o flag `stale`.
- `UpdateMaterialUseCase`: si cambia `content` y había preguntas, marcar desfase.
- DTO de material: exponer la marca para la web.
- Tests de update con material procesado vs pendiente.

### Frontend
- Badge de estado (`material-status-badge`) para el desfase.
- Diálogo de edición: aviso de que hay que reprocesar para actualizar preguntas.

## Fuera de alcance (por ahora)

- Reprocesar en automático al guardar (sigue siendo on-demand).
- Arreglar la cascada al reprocesar (`docs/ToDo/reprocesar-material-preserva-historial.md`).

## Notas

- Hallazgo del wiki: `wiki/components/materiales.md` (pase sobre `apps/api/src`).
- Coherencia con AGENTS.md: procesamiento on-demand; no meter cola/worker.
