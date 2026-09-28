# Requerimiento: crear un material desde el listado de materiales

## Contexto

La vista `MaterialsView` (`apps/web/components/views/materials-view.tsx`) lista, procesa, edita y elimina materiales, pero **no tiene ningún control para crear uno nuevo**. El encabezado (líneas 168–175) solo lleva título y subtítulo; el estado vacío dice «Usa el botón «Agregar material» para subir tus apuntes» y apunta a un botón que **no está en esa pantalla**.

Hoy el diálogo de alta (`MaterialDialog` en `apps/web/components/dialogs/material-dialog.tsx`) solo se abre desde:

- el FAB / sidebar (`apps/web/components/layout/mobile-nav.tsx`, `sidebar.tsx`);
- Inicio (`apps/web/components/views/home-view.tsx`).

`page.tsx` pasa `openMaterialDialog` a `AppShell` y a `HomeView`, pero **no** a `MaterialsView`. En materias sí hay el patrón esperado: `SubjectsView` tiene «+ Nueva materia» en el encabezado.

Además, al crear un material desde el FAB, `onCreated` solo refresca el contador de la materia (`refreshSubjectMaterialCount`); si el usuario está en la vista Materiales, el listado no se actualiza hasta recargar filtros.

## Objetivo

Que el estudiante pueda agregar un material **desde la propia pantalla Materiales**, con materia y tema ya preseleccionados según los filtros de esa vista, y que el listado se actualice al guardar.

## Alcance propuesto

- Botón primario en el encabezado de `MaterialsView`, mismo patrón que «+ Nueva materia» (`subjects-view.tsx`): p. ej. «+ Agregar material».
- En el estado vacío, el mismo CTA (no solo un texto que apunta a otro sitio).
- Reutilizar `MaterialDialog` y `useMaterials.open`; no crear otro flujo de alta.
- Al abrir desde esta vista, preseleccionar la materia (y el tema, si hay) que el usuario tiene filtrados.
- Tras crear, recargar el listado del tema activo (hoy `MaterialsView` no se entera del alta).

## Cambios implicados

### Backend
- Sin cambios (ya existen `POST /materials` y `POST /materials/upload`).

### Frontend
- `apps/web/app/page.tsx`: pasar `openMaterialDialog` (y, si hace falta, un callback de «material creado») a `MaterialsView`.
- `apps/web/components/views/materials-view.tsx`: botón en el header y en `EmptyPanel`.
- `apps/web/hooks/use-materials.ts`: ampliar `preselectSubject` para aceptar también `topicId`, o un `open({ subjectId, topicId })`.
- `apps/web/components/dialogs/material-dialog.tsx`: respetar el tema preseleccionado si llega.
- Tras `onCreated`, invalidar/recargar `listMaterials` de la vista (hoy solo se actualiza el contador de la materia).

## Fuera de alcance (por ahora)

- Crear un tema nuevo desde esta pantalla si la materia no tiene temas (el vacío actual ya redirige al diálogo de material).
- Cambiar el FAB global; puede convivir.

## Notas

- Coherencia con AGENTS.md: mobile-first; el listado es el sitio natural de «crear» (como en materias).
- Relacionado: `docs/ToDo/evitar-analisis-ia-al-elegir-archivo.md` (el diálogo de alta es el mismo).
