# Sesión: Ajuste del modal de material y deploy automático en Coolify

**Fecha:** 2026-10-19
**Estado:** Completado

## Contexto

Tres temas en la sesión:

1. **Bug de UI en el diálogo "Agregar material".** Tras añadir el selector de modo de generación, el
   formulario creció y el panel del modal (que no tiene `max-h` ni scroll en su variante por defecto)
   rebasaba la ventana: en desktop el botón "Agregar material" quedaba bajo la barra de tareas y en
   móvil el selector se cortaba a la mitad. Causa raíz en `apps/web/components/dialogs/dialog.tsx:21-23`:
   el caso no-`wide` solo fija `max-w-lg` sin tope de altura.
2. **Deploy automático GitHub → Coolify.** El usuario quería dejar de hacer redeploys manuales y
   disparar el build con cada push. El repo es público (`skcode7/estudIA`, rama `master`).
3. **Ambiente staging/QA.** Duda general sobre cómo aislar un entorno de pruebas del de producción.

El feature de modo de generación de preguntas tiene su propio resumen en
`2026-10-19-modo-generacion-preguntas-material.md`.

## Cambios realizados

### Frontend

- `apps/web/components/dialogs/material-dialog.tsx`:
  - El `<Dialog>` ahora recibe `wide` (`material-dialog.tsx:262`), así el panel pasa a
    `max-h-[90vh] max-w-2xl overflow-y-auto` y deja de desbordar la ventana; en desktop se scrollea
    hasta "Agregar material" y en móvil hasta el selector.
  - El contenedor de los dos botones de modo usa `flex flex-col gap-2 sm:flex-row`
    (`material-dialog.tsx:433`): en móvil se apilan (cada uno ocupa todo el ancho) y en desktop siguen
    lado a lado.

### Documentación

- `wiki/components/ia.md`, `wiki/components/web.md`, `wiki/flows/procesamiento-de-material.md`:
  reestampado `synced` a `e0601e0` (el cambio de archivo no movió líneas, así que las citas siguen
  válidas).
- `README.md` (commit `66450bc` del usuario): nota de una línea recordando configurar el webhook para
  el deploy automático.

### Configuración (sin código en el repo)

- **Webhook GitHub → Coolify**: se indicaron los pasos exactos. El usuario lo configuró y confirmó que
  el deploy automático funciona: push a `master` dispara build en Coolify para las apps `web` y `api`
  (Dockerfile por app, `Base Directory` vacío, rama `master`, Auto Deploy = "Deploy on push
  (webhooks)", webhook manual de GitHub con secreto coincidente). La migración se aplica en producción
  vía `prisma migrate deploy` en el `CMD` del Dockerfile (`apps/api/Dockerfile:36`).
- **Staging/QA**: se recomendó rama `staging` + proyecto/environment Coolify aparte, con `web`/`api`/DB/
  storage propios, dominios `staging.*` y su propio webhook, sin reusar recursos de producción.

## Validaciones

- `pnpm --filter @estudia/web typecheck` ✓ y `eslint` ✓ tras el ajuste del modal.
- Deploy automático verificado por el usuario (push a `master` → build en Coolify).
- `wikipoke check` ✓ tras reestampar las 3 páginas afectadas.

## Commits

| Hash | Descripción |
|------|-------------|
| `665ef6e` | fix(web): modal de material con scroll y selector de modo apilado en móvil |
| `e0601e0` | wiki: reconcilia el diálogo de material tras el scroll y el selector responsive |
| `66450bc` | Fix (readme): Nota de webhook |

## Pendientes / próximos pasos

- **Staging:** crear rama `staging`, nuevo environment/proyecto en Coolify con `web`/`api`/postgres/
  storage aislados, variables `NEXT_PUBLIC_API_URL`/`DATABASE_URL`/`WEB_URL`/bucket propios y webhook a
  `staging`. No reusar DB ni bucket de producción.
- **Preview Deployments**: para probar cada PR sin tocar staging, activar el soporte de previews de
  Coolify una vez exista el GitHub App.
- El `pnpm verify:deploy` local sigue sin poder ejecutarse aquí (Docker no invocable en este WSL), pero
  el path de producción ahora se valida con el deploy real de Coolify.
