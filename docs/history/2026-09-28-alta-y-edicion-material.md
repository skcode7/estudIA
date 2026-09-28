# Sesión: Alta de material desde el listado y edición con preguntas e imágenes

**Fecha:** 2026-09-28
**Estado:** Completado

## Contexto

Dos requerimientos registrados en `docs/ToDo` a partir de la revisión de la pantalla Materiales. `crear-material-desde-listado.md`: la vista listaba, procesaba, editaba y eliminaba materiales, pero no tenía forma de crear uno; el estado vacío mandaba a un botón «Agregar material» que no estaba en esa pantalla (solo existía en el FAB/sidebar y en Inicio), y el alta desde el FAB no refrescaba el listado. `mejorar-pantalla-edicion-material.md`: el diálogo de edición solo editaba título y contenido, con un título y un subtítulo redundantes, y no daba acceso a las preguntas generadas ni a las figuras extraídas. Ambos quedaron implementados y se retiraron del ToDo.

## Cambios realizados

### Backend
- `apps/api/src/modules/materials/application/ports/material-question.repository.ts` — registros `MaterialQuestionRecord`/`MaterialQuestionOptionRecord`, `UpdateMaterialQuestionInput` y métodos `listByMaterial`, `findByIdForMaterial`, `update`, `delete`.
- `apps/api/src/modules/materials/infrastructure/prisma-material-question.repository.ts` — implementa los cuatro métodos; `update` borra y recrea las opciones dentro de una transacción.
- Nuevos casos de uso (+ spec con 9 tests): `list-material-questions`, `update-material-question`, `delete-material-question`, `list-material-images`. Validan pertenencia al material, 2–6 opciones y exactamente una correcta, e imagen del material.
- `apps/api/src/modules/materials/presentation/dto/materials.dto.ts` — `MaterialQuestionDto`, `MaterialQuestionOptionDto`, `UpdateMaterialQuestionDto`, `UpdateMaterialQuestionOptionDto`, `MaterialImageDto`.
- `apps/api/src/modules/materials/presentation/controllers/materials.controller.ts` — `GET /:id/questions`, `PATCH /:id/questions/:questionId`, `DELETE /:id/questions/:questionId`, `GET /:id/images` (metadatos; el binario ya existía).
- `apps/api/src/modules/materials/materials.module.ts` — registra los cuatro casos de uso.
- Specs existentes ampliados con los métodos nuevos del puerto.

### Frontend
- `apps/web/lib/api.ts` — `listMaterialQuestions`, `updateMaterialQuestion`, `deleteMaterialQuestion`, `listMaterialImages` y sus tipos.
- `apps/web/hooks/use-materials.ts` — `open({ subjectId, topicId })` y `preselectedTopicId`.
- `apps/web/components/dialogs/material-dialog.tsx` — respeta el tema preseleccionado.
- `apps/web/components/views/materials-view.tsx` — «+ Agregar material» en el encabezado y CTA en el estado vacío, con materia/tema preseleccionados; recarga del listado vía `reloadSignal`; `onQuestionsChanged` para refrescar `questionCount`.
- `apps/web/components/dialogs/material-edit-dialog.tsx` — título único «Editando material de {materia}», pestañas **Preguntas** (editar enunciado/explicación/opciones, eliminar con confirmación) e **Imágenes** (galería de solo consulta).
- `apps/web/components/dialogs/dialog.tsx` — prop `wide` para diálogos con pestañas.
- `apps/web/app/page.tsx` — pasa `openMaterialDialog` y el contador de recarga a `MaterialsView`.

### Documentación
- Eliminados `docs/ToDo/crear-material-desde-listado.md` y `docs/ToDo/mejorar-pantalla-edicion-material.md`.
- `docs/history/2026-09-28-alta-y-edicion-material.md` — este resumen.

## Validaciones

- `vitest run src/modules/materials` (API): 48 tests en 13 archivos, todos pasan.
- `tsc --noEmit` (API y web): exit 0.
- `eslint` (API y web): 0 errores; 2 avisos de `no-img-element` en el diálogo de edición (mismo patrón que ya usa `quiz-view.tsx`).
- El wiki de código quedó desfasado respecto a materiales y web (`wikipoke-ingest` pendiente).

## Commits

| Hash | Descripción |
|------|-------------|
| `1b39eff` | feat(api): CRUD de preguntas de material y listado de imágenes |
| `95b7a11` | feat(web): alta de material desde el listado y edición con preguntas e imágenes |
| `ee05048` | docs(todo): retira los requerimientos implementados |

## Pendientes / próximos pasos

- Actualizar el wiki (`wikipoke-ingest`) para materiales y web.
- Búsqueda de imágenes con `next/image` en el diálogo (avisos de lint).
- Editar/borrar imágenes sueltas desde la pestaña Imágenes.
- El resto de ToDos del wiki: `marcar-material-desactualizado.md`, `preguntas-huerfanas-al-borrar-material.md`, `reprocesar-material-preserva-historial.md`.
- Al borrar una pregunta sigue arrastrando `QuizQuestion` y `Answer` (documentado en el propio diálogo, pendiente de resolver en código).
