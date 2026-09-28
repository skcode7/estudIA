# Requerimiento: mejorar la pantalla de edición de material

## Contexto

Hoy `MaterialEditDialog` (`apps/web/components/dialogs/material-edit-dialog.tsx`) es un modal estrecho (`Dialog` con `max-w-lg` en `apps/web/components/dialogs/dialog.tsx`) que solo edita título y contenido:

- Título del diálogo: `"Editar material"`.
- Subtítulo: `"Editando el material de la materia {subjectName}."`.
- `PATCH /materials/:id` vía `UpdateMaterialUseCase` (`apps/api/src/modules/materials/application/use-cases/update-material.use-case.ts`): no toca preguntas ni imágenes.

Las preguntas se generan al procesar (`replaceForMaterial` en `apps/api/src/modules/materials/application/ports/material-question.repository.ts`) y el listado solo muestra `questionCount`. No hay endpoint para listar, editar o borrar una pregunta de un material.

Las figuras extraídas viven en `MaterialImage` y se sirven de una en una (`GET /materials/:id/images/:imageId`). El repositorio sí tiene `listByMaterial`, pero la API no expone un listado de metadatos (id, label, order) para la pantalla de edición.

## Objetivo

Que al editar un material el título diga de qué materia se trata, y que el usuario pueda ver y corregir las preguntas generadas (editar o eliminar) y ver las imágenes asociadas, sin tener que reprocesar todo el material.

## Alcance propuesto

- Título único del diálogo: `"Editando material de {subjectName}"`. Quitar el subtítulo actual.
- En la misma pantalla, dos pestañas:
  - **Preguntas**: listar las generadas (enunciado, opciones, cuál es correcta, explicación, imagen vinculada si hay). Permitir editar una pregunta y eliminar una pregunta.
  - **Imágenes**: galería de figuras extraídas (`label` + preview vía `GET /materials/:id/images/:imageId`). En esta iteración, solo consulta (sin recortar ni borrar figuras sueltas).
- Si el material no está `COMPLETED` o no tiene preguntas/imágenes, las pestañas se muestran vacías con un mensaje claro.
- El formulario de título/contenido se mantiene (encima de las pestañas o en una pestaña "Material", según quepa en móvil).

## Cambios implicados

### Backend
- `MaterialQuestionRepository`: `listByMaterial`, `update`, `delete` (hoy solo `countByMaterials` y `replaceForMaterial`).
- Casos de uso + DTOs + rutas, p. ej.:
  - `GET /materials/:id/questions`
  - `PATCH /materials/:id/questions/:questionId`
  - `DELETE /materials/:id/questions/:questionId`
  - `GET /materials/:id/images` (metadatos; el binario ya existe).
- Validar que la pregunta/imagen pertenece al material; al editar, exigir exactamente una opción correcta (misma regla que el mapper de IA).
- Tests de los casos de uso (404, pregunta ajena, borrar la última pregunta).

### Frontend
- `apps/web/lib/api.ts`: cliente de listado/edición/borrado de preguntas y listado de imágenes; reutilizar `assetUrl`.
- `apps/web/components/dialogs/material-edit-dialog.tsx`: título unificado y pestañas Preguntas / Imágenes.
- Valorar un `Dialog` más ancho en esta pantalla (mobile-first: pestañas apiladas, no dos columnas).

## Fuera de alcance (por ahora)

- Crear preguntas nuevas a mano o regenerar con IA desde el diálogo.
- Editar, recortar o borrar imágenes sueltas (solo visualización).
- Marca de material desfasado al editar contenido (`docs/ToDo/marcar-material-desactualizado.md`).
- Preservar historial de quizzes al borrar una pregunta (`docs/ToDo/reprocesar-material-preserva-historial.md`): borrar una pregunta hoy cascada `QuizQuestion` y `Answer`.

## Notas

- Coherencia con AGENTS.md: validar inputs; no dejar lógica de negocio en el controller; mobile-first.
- Relacionado: `docs/ToDo/marcar-material-desactualizado.md`, `docs/ToDo/preguntas-huerfanas-al-borrar-material.md`.
- El `Dialog` actual no tiene pestañas; conviene un control mínimo local, no un sistema de routing.
