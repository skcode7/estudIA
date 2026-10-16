# Sesión: Revisión de ToDo y reconciliación de la wiki

**Fecha:** 2026-10-16
**Estado:** Completado

## Contexto

La lista de requerimientos pendientes en `docs/ToDo/` había crecido hasta 25 archivos. Muchos eran requerimientos hermanos que tocaban el mismo componente o flujo, y uno de ellos (`modulo-evaluaciones.md`) describía una funcionalidad que ya estaba implementada. En paralelo, el wiki de código (`wiki/`) llevaba 24 commits sin reconciliar y el hook de inicio reportaba páginas stale y citaciones movidas.

Objetivos de la sesión:

1. Auditar los ToDo existentes, eliminar los resueltos y unificar los similares.
2. Actualizar las referencias cruzadas para que no apunten a archivos eliminados.
3. Ejecutar `wikipoke-ingest` para reconciliar la wiki con el estado actual del repo.

## Cambios realizados

### Backend

- Sin cambios de código.

### Frontend

- Sin cambios de código.

### Documentación

#### ToDo

- **Eliminados (resueltos u obsoletos):**
  - `docs/ToDo/modulo-evaluaciones.md` — el módulo de Evaluaciones ya está implementado.
  - `docs/ToDo/color-icono-materias.md`
  - `docs/ToDo/contador-materiales-tarjetas.md`
  - `docs/ToDo/exponer-progreso-basico.md`
  - `docs/ToDo/confirmar-borrado-en-cascada.md`
  - `docs/ToDo/limpiar-storage-al-borrar-cascada.md`
  - `docs/ToDo/evitar-analisis-ia-al-elegir-archivo.md`

- **Creados (unificaciones):**
  - `docs/ToDo/tarjetas-materia-datos-reales.md` — absorbe contador de materiales, progreso real y color/ícono de las tarjetas de materia (mismo punto de falla en `decorateSubject`).
  - `docs/ToDo/borrado-en-cascada-con-confirmacion-y-limpieza.md` — absorbe confirmación de borrado y limpieza de object storage.

- **Actualizados (referencias cruzadas):**
  - `docs/ToDo/ciclo-vida-preguntas-material.md`
  - `docs/ToDo/generacion-inteligente-quiz.md`
  - `docs/ToDo/indicador-imagenes-en-materiales.md`
  - `docs/ToDo/listado-quizzes-con-resultado.md`
  - `docs/ToDo/modo-generacion-preguntas.md`

#### Wiki

- **Nueva página:** `wiki/components/evaluaciones.md` — documenta el módulo de Evaluaciones implementado en la sesión anterior.
- **Páginas reconciliadas y citaciones re-apuntadas:**
  - `wiki/architecture.md` — incluye `EvaluationsModule` en el mapa.
  - `wiki/components/catalogo.md`
  - `wiki/components/ia.md` — `AIProvider` ahora incluye `analyzeEvaluationDraft` y `extractEvaluationQuestions`.
  - `wiki/components/materiales.md`
  - `wiki/components/persistencia.md`
  - `wiki/components/quizzes.md`
  - `wiki/components/vistas-de-catalogo.md` — Evaluaciones reemplazó a Repaso en navegación.
  - `wiki/components/web.md`
  - `wiki/concepts/configuracion-por-entorno.md`
  - `wiki/concepts/puertos-y-adapters.md`
  - `wiki/decisions/proveedor-ia.md`
  - `wiki/flows/figuras-embebidas.md`
  - `wiki/flows/generar-y-resolver-quiz.md`
  - `wiki/flows/procesamiento-de-material.md`
- **Índice y registro:**
  - `wiki/index.md` — enlaza la página de evaluaciones.
  - `wiki/log.md` — entrada de la sesión.
  - `wiki/.wikipoke-state.json` — checkpoint avanzado a `a9c3163`.

## Validaciones

- `node_modules/.bin/wikipoke check` ✓ — 0 errores, 0 warnings de drift; quedan 15 archivos uncovered menores.
- No se tocó código fuente, por lo que lint/typecheck/tests no aplican a esta sesión.

## Commits

| Hash | Descripción |
|------|-------------|
| `ce16b81` | docs(ToDo): unifica tarjetas y borrado, elimina evaluaciones resuelto |
| `075740e` | wiki: reconcilia con evaluaciones, re-apunta citas y actualiza ToDo refs |

## Pendientes / próximos pasos

- Implementar `docs/ToDo/tarjetas-materia-datos-reales.md` (datos reales en tarjetas de materia).
- Implementar `docs/ToDo/borrado-en-cascada-con-confirmacion-y-limpieza.md`.
- Revisar `docs/ToDo/ciclo-vida-preguntas-material.md`: la Fase 1 ya está implementada; evaluar si se divide o se mantiene con Fases 2-4 pendientes.
- Continuar con el resto de ToDo abiertos: identity provider, desacoplamiento de módulos, mapeo explícito de enums, validación de entorno, proxy same-origin, roles tutor/alumno, etc.
