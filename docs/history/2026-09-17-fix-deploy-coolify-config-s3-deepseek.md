# Sesión: Fix deploy en Coolify, configuración S3 y DeepSeek

**Fecha:** 2026-09-17
**Estado:** Completado

## Contexto

El despliegue del frontend (`apps/web`) en Coolify fallaba por un directorio `public` faltante en el Dockerfile. A su vez, el procesamiento de materiales no funcionaba porque la configuración S3 (Backblaze B2) tenía `S3_REGION` y `S3_ENDPOINT` inconsistentes. Finalmente, se completó la configuración de DeepSeek para que la generación de preguntas mediante IA esté operativa.

## Cambios realizados

### Backend
- Sin cambios de código fuente; únicamente ajuste de variables de entorno en Coolify:
  - `S3_REGION=eu-central-003`
  - `S3_ENDPOINT=https://s3.eu-central-003.backblazeb2.com`
  - `DEEPSEEK_API_KEY` (configurado por el usuario)

### Frontend
- `apps/web/public/.gitkeep` — creado para que el `COPY` del Dockerfile no falle.

### Documentación
- `README.md` — corregida la sección "Deploy en Coolify" para reflejar la arquitectura real (API pública, fetch client-side, valor correcto de `NEXT_PUBLIC_API_URL`).
- `.gitignore` — excluida la carpeta `.sisyphus/` generada por el agente de planificación.
- `docs/ToDo/proxy-same-origin-api.md` — requerimiento futuro para eliminar la API pública y CORS mediante route handlers same-origin.
- `docs/ToDo/logging-errores-originales.md` — requerimiento futuro para preservar mensajes de error originales en catch silenciosos de S3 y DeepSeek.

## Validaciones

- Verificación manual de build de imagen Docker tras crear `public/.gitkeep`.
- Curl de health check de API pública: `200 {"status":"ok"}`.
- Verificación CORS: origen permitido (`https://estudia.server.encaladadiaz.com`) y origen ajeno rechazado correctamente.
- Verificación TLS: certificado Let's Encrypt vigente.
- Verificación web: HTTP 200, `<title>estudIA</title>`, estable en checks consecutivos.
- Playwright E2E: request `GET /api/v1/users` desde browser exitoso (status 200, URL correcta).
- Upload de materiales a S3 (Backblaze B2) verificado funcional tras corregir región y endpoint.

## Commits

| Hash | Descripción |
|------|-------------|
| `d9e1e87` | fix(web): add missing public directory for Docker build |
| `84199c0` | docs(readme): correct Coolify deployment architecture for client-side fetch |
| `335afa7` | Fix(Git): Se excluye carpeta de agente |
| `7a37b11` | Fix(ToDo): Nuevos requerimientos |

## Pendientes / próximos pasos

- Configurar webhook auto-deploy GitHub → Coolify para evitar redeploys manuales.
- Implementar proxy same-origin en el frontend para eliminar la necesidad de API pública y CORS.
- Mejorar logging de errores originales en los catch silenciosos de S3 (`create-file-material.use-case.ts`) y DeepSeek.
