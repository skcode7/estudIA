# Requerimiento: proxy same-origin para eliminar la API pública (server-fetch)

## Contexto

Hoy `apps/web` es una SPA client-side: todas las llamadas a la API salen del navegador (`apps/web/lib/api.ts:62` usa `NEXT_PUBLIC_API_URL`) hacia la API pública `https://estudia-api.server.encaladadiaz.com/api/v1`, expuesta vía Traefik con certificado propio. CORS es single-origin mediante `WEB_URL` (`apps/api/src/main.ts:10`).

Esto funciona, pero tiene tres puntos débiles que crecen con el tiempo:

1. La URL de la API queda incrustada en el bundle del navegador y la API MVP no tiene autenticación: hay dos puertas públicas (web y API) sin control de acceso real en ninguna.
2. `NEXT_PUBLIC_*` es variable de build-time: cambiar el host de la API exige rebuild completo de la imagen (verificado en el deploy del 2026-09-17).
3. CORS es una pieza más que sincronizar (`WEB_URL` debe coincidir exactamente con el origen del web).

## Objetivo

Que el navegador llame siempre al mismo origen (`/api/v1/*`), servido por route handlers de Next.js que hacen el fetch del lado del servidor contra la API interna (red Docker de Coolify). La API vuelve a ser interna: sin dominio público, sin CORS, y con la URL de la API como variable de entorno de runtime (server-only, sin rebuild).

## Alcance propuesto

- Route handler catch-all `apps/web/app/api/[...path]/route.ts` que reenvía method, headers relevantes (`content-type`, `authorization` cuando exista) y body en streaming (sin parsear, crítico para `multipart/form-data` de materiales) a la API interna, devolviendo status + body tal cual.
- `apps/web/lib/api.ts:62`: `API_URL` pasa a ser la ruta relativa `/api/v1` (mismo origen).
- Restructuración de env vars: eliminar `NEXT_PUBLIC_API_URL` del recurso web; agregar `API_URL=http://<host-interno-api>:3001/api/v1` (server-only, runtime).
- Config Coolify: quitar el dominio público del recurso API (vuelve a enrutado interno).

## Cambios implicados

### Backend
- Sin cambios de código. Solo configuración en Coolify: quitar dominio público del recurso API; `WEB_URL` pasa a ser opcional (sin CORS cross-origin ya no aplica).

### Frontend
- Nuevo: `apps/web/app/api/[...path]/route.ts` (handlers GET/POST/PUT/DELETE con passthrough transparente de status/headers/body).
- Modificar `apps/web/lib/api.ts:62` (URL relativa same-origin).
- Evaluar límite de body del route handler para el upload de materiales (PDFs).
- Los route handlers se incluyen en el build `output: "standalone"` — sin cambios de Dockerfile.

## Fuera de alcance (por ahora)

- Autenticación (Authentico sigue fuera del MVP). Nota honesta: el proxy NO es control de acceso — quien conozca la ruta pública del proxy puede llamarla igual; su valor es reducir superficie, ocultar el endpoint real y crear el punto de enforcement central.
- Rate limiting u otra protección del proxy.
- Soporte de clientes nativos/terceros (si llegan, requerirán API pública + auth de todos modos; el proxy conviviría con ella).

## Notas

- Trigger natural: cuando llegue Authentico (verificar sesión en el route handler y reenviar con credenciales internas — el browser jamás toca tokens internos) o antes si la API pública sin auth pasa a ser preocupación. Es la "frontera arquitectónica preparada" que exige AGENTS.md.
- Costo de runtime: +1 hop para uploads (browser → web → API); en el mismo servidor es despreciable (~1-2ms).
- Coherencia con AGENTS.md: dominio y aplicación no dependen de proveedores; env vars de runtime sin rebuild; no sobreingenieriar mientras el MVP no lo exija.
- Verificación E2E reutilizable: los scenarios del plan `fix-coolify-web-deploy` (curl suite + Playwright con captura de red) se re-adaptan a same-origin sin casi cambios.
- Referencia: evaluado como "Opción B" en la sesión de planificación del deploy (2026-09-17); en su momento se eligió API pública por velocidad de despliegue.
