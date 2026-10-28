# Requerimiento: paginado en la vista de materiales

## Contexto

La vista de materiales (`apps/web/components/views/materials-view.tsx:263-329`) renderiza **todos** los materiales del tema seleccionado en una sola lista. Cada tarjeta muestra el `content` completo en el elemento (`lines 281-284`) envuelto con `line-clamp-2` y `title`, pero el objeto `material` entero viaja en el listado; además, al confirmar la creación de un material desde el diálogo, el flujo recarga la lista completa y vuelve a renderizar todas las tarjetas. En materias con varios materiales (y especialmente en móvil) eso genera un payload grande y un re-render pesado: el usuario reporta una alerta de falta de memoria al confirmar y el material no se carga.

También el listado ya consume `questionCount` para mostrar "X preguntas generadas" (`lines 291-296`), pero sigue arrastrando `content` completo para todos los elementos cuando con un preview basta para la tarjeta.

## Objetivo

Que el listado de materiales sea liviano en móvil, evitando cargar y renderizar todos los materiales a la vez y reduciendo el tamaño del payload enviado por el listado.

## Alcance propuesto

### Backend
- Añadir paginado al listado de materiales por tema. Opción A (simple, coherente con el resto de la API): `GET /materials?topicId=...&limit=...&offset=...` devolviendo `{ items: MaterialDto[], total: number }`. Opción B: mantener el array pero añadir `contentPreview` y, si hace falta, un `hasMore`. Priorizar A si no complica el caso de uso existente; en cualquier caso evitar N+1.
- En `MaterialDto` del listado (`apps/api/src/modules/materials/presentation/dto/materials.dto.ts`), incluir un preview corto del contenido (p. ej. `contentPreview` o truncar `content`) en lugar de depender solo del `title` y los contadores. El texto completo sigue estando disponible al editar el material (diálogo de edición ya carga el material completo).
- Ajustar `ListMaterialsUseCase` para soportar paginado; mantener `GET /materials` compatible si se pasa solo `topicId` (retrocompatible) o migrar el cliente al nuevo shape.

### Frontend
- `apps/web/lib/api.ts`: adaptar `listMaterials` para paginado (y actualizar tipo `ApiMaterial` si cambia el shape).
- `apps/web/components/views/materials-view.tsx:238-331`: reemplazar el renderizado completo por paginado simple: "Mostrar más" incremental (o paginación numérica). Mantener el estado de carga (`areMaterialsLoading`) por página/append.
- Reducir lo que se muestra en la tarjeta: usar preview corto (del DTO) en lugar de depender del `content` completo cuando el DTO ya lo provea; seguir mostrando `processingStatus`, `questionCount`, ícono, etc. tal como ahora.

## Fuera de alcance (por ahora)
- Infinite scroll con `IntersectionObserver` complejo; "Mostrar más" incremental es suficiente para el MVP.
- Paginado de preguntas dentro del material.
- Cambiar cómo se guarda/carga el contenido completo (sigue existiendo en el detalle/edición).
- Paginado por materia/global; el paginado es por tema, que es el filtro actual.

## Notas
- Coherente con AGENTS.md: mobile-first, evitar lógica en cliente para inventar datos, mantener cambios pequeños. El bug reportado es reproducible al confirmar la creación (recarga de lista) — atacar tanto el tamaño de payload como el volumen de DOM.
- Relacionado con `docs/ToDo/indicador-imagenes-en-materiales.md` (el listado ganará más metadatos) y con `docs/ToDo/material-multi-imagen-backend.md` (los materiales pueden crecer en número de imágenes pero el listado debe seguir liviano).
- Si el preview en DTO no resuelve del todo el OOM en casos extremos, el paginado por sí solo ya limita el re-render.
