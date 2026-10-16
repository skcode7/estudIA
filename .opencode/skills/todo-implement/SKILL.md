---
name: todo-implement
description: Inicia la implementación de un plan retirando de docs/ToDo el requerimiento relacionado. Usar cuando el usuario pida empezar a implementar un plan o un requerimiento del ToDo, p. ej. "implementa docs/ToDo/tarjetas-materia-datos-reales.md", "arranca el plan de <slug>", "empieza con este requerimiento", "vamos a implementar este ToDo".
---

# Inicio de implementación y retiro del ToDo

Cuando el usuario pida empezar la implementación de un plan, seguir este flujo **antes de escribir código**.

## Por qué el ToDo se retira al empezar

`docs/ToDo/` es la lista de lo pendiente. En cuanto una implementación arranca, ese requerimiento deja de estar pendiente: el archivo se retira con `git rm` y su contenido queda en el historial de git y, al cerrar la sesión, en `docs/history`. Dejarlo en la carpeta convierte `docs/ToDo/` en una lista con requerimientos ya implementados, y la siguiente revisión tiene que volver a auditarlos uno por uno para descubrirlo (ver `docs/history/2026-10-16-revision-todos-y-wiki.md`).

## Flujo

1. **Resolver el ToDo relacionado.**
   - Ruta explícita → usar esa.
   - Solo un tema o slug mencionado → buscar con `docs/ToDo/*.md` y leer el encabezado (`# Requerimiento: ...`) para confirmar que es el archivo correcto.
   - Varios candidatos → listarlos con una línea de contexto cada uno y pedir al usuario que elija. No elegir por cercanía temática.
   - Ningún archivo (el plan no nace de un ToDo) → no borrar nada, decirlo y seguir con el plan.

2. **Leer el ToDo completo antes de retirarlo.** Es el input del plan: Objetivo, Alcance propuesto, Cambios implicados (Backend / Frontend), Fuera de alcance y Notas. Las Notas suelen contener la decisión que el plan debe respetar (p. ej. cuál agregado de porcentaje usar) y el motivo por el que un atajo está descartado.

3. **Comprobar si el plan cubre el ToDo entero.** Si el ToDo está dividido en fases o el plan implementa solo una parte, **no se borra**: se edita el ToDo quitando lo implementado y dejando lo pendiente.
   - Caso vivo: `docs/ToDo/ciclo-vida-preguntas-material.md` tiene la Fase 1 ya implementada y las Fases 2-3 abiertas; se marcó «— implementada» en vez de retirar el archivo.

4. **Actualizar las referencias cruzadas antes de borrar.** Otros ToDo y páginas del wiki citan rutas de `docs/ToDo/`; al borrar el archivo esas citas quedan apuntando a un archivo inexistente:

   ```
   grep -rn "<slug>" docs/ToDo wiki
   ```

   Las citas en `docs/history/` son registro de sesiones pasadas y **no se tocan** (son la prueba de que el requerimiento existió). Las de otros ToDo y del wiki sí: re-apuntar al requerimiento que absorbió el tema, o anotar que quedó implementado.

5. **Retirar el archivo** con `git rm docs/ToDo/<slug>.md`. **No commitear aquí**: la eliminación viaja en los commits atómicos de la implementación, como en `a74d740`, que borró `paginacion-materias.md` junto al fix de la duración del quiz.

6. **Reportar**: la ruta retirada, las referencias cruzadas actualizadas y el plan a ejecutar derivado del ToDo.

## Reglas

- **Idioma**: español, igual que el resto de la documentación del repo.
- **Esta skill no implementa el plan**: resuelve el ToDo, lo retira y deja el plan listo para ejecutarse.
- **No borrar a ciegas**: nunca eliminar sin haber leído el archivo y sin certeza de que es el relacionado.
- **Implementación parcial**: si el ToDo quedó a medias, se actualiza en vez de retirarse.
- **No editar** los resúmenes de `docs/history/` ni `wiki/.wikipoke-state.json` desde esta skill.
