# Sesión: Acciones de materiales y ToDos del wiki

**Fecha:** 2026-09-28
**Estado:** Completado

## Contexto

El wiki de código (wikipoke) dejó anotados huecos de producto que no estaban en `docs/ToDo`. En paralelo se trabajó la vista Materiales: el botón «✨ IA mode» no era consistente con Editar (icono ghost) y faltaba eliminar. Después se registraron dos mejoras de esa misma pantalla (alta desde el listado y edición con preguntas/imágenes) sin implementarlas.

## Cambios realizados

### Backend
- Sin cambios.

### Frontend
- `apps/web/lib/api.ts` — `deleteMaterial`; `request()` acepta respuestas 204 o cuerpo vacío.
- `apps/web/components/views/materials-view.tsx` — tres botones de la misma forma: **Procesar** (primario, solo `PENDING`/`FAILED`), **✎ Editar** (tintado), **✕ Eliminar** (rose).
- `apps/web/components/dialogs/material-delete-dialog.tsx` — confirmación de borrado; avisa que las preguntas del tema se conservan.

### Documentación
- Diez requerimientos a partir de hallazgos del wiki: `reprocesar-material-preserva-historial.md`, `limpiar-storage-al-borrar-cascada.md`, `exponer-progreso-basico.md`, `pistas-y-explicaciones-quiz.md`, `marcar-material-desactualizado.md`, `persistir-quiz-en-curso.md`, `validar-entorno-al-arrancar.md`, `confirmar-borrado-en-cascada.md`, `preguntas-huerfanas-al-borrar-material.md`, `evitar-analisis-ia-al-elegir-archivo.md`.
- Dos ToDos de la vista Materiales: `crear-material-desde-listado.md`, `mejorar-pantalla-edicion-material.md`.
- `docs/history/2026-09-28-materiales-acciones-y-todos.md` — este resumen.

## Validaciones

- `pnpm --filter @estudia/web lint`: exit 0.
- `pnpm --filter @estudia/web typecheck`: exit 0.
- No se tocó `apps/web/next-env.d.ts` (cambio automático de Next al arrancar en modo dev).

## Commits

| Hash | Descripción |
|------|-------------|
| `b8d6ea8` | docs(todo): registra hallazgos del wiki como requerimientos pendientes |
| `9342e58` | feat(web): unifica acciones de material en Procesar, Editar y Eliminar |
| `4e2cfef` | docs(todo): alta desde el listado y mejora de la edición de material |

## Pendientes / próximos pasos

- Implementar `docs/ToDo/crear-material-desde-listado.md` (CTA de alta en Materiales).
- Implementar `docs/ToDo/mejorar-pantalla-edicion-material.md` (título unificado, pestañas preguntas/imágenes).
- El wiki de código está desfasado respecto a `apps/web/lib/api.ts` (`wikipoke-ingest`).
- Resto de ToDos del wiki (progreso, reprocesar sin romper historial, storage en cascada, etc.).
