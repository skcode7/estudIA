# estudIA — Documentación técnica

## Visión
estudIA convierte materiales y temas aprendidos en la escuela en una experiencia de estudio interactiva, con quizzes y retroalimentación asistida por IA.

## Estado actual
MVP individual, sin autenticación y sin restricciones de uso.

## Ejecutar y verificar el proyecto inicial

Requisitos: Node.js `22.22.2`, pnpm `12.3.4` y Docker con Compose. Si utilizas nvm, activa la versión fijada con `nvm use`.

```bash
pnpm install
docker compose up -d postgres
cp .env.example apps/api/.env
pnpm db:deploy
pnpm dev
```

Con `pnpm dev` en ejecución, verifica en otra terminal:

```bash
curl http://localhost:3001/api/v1/health
```

La respuesta esperada es:

```json
{"status":"ok"}
```

También puedes abrir `http://localhost:3000` para comprobar la página inicial de Next.js y `http://localhost:3001/api/docs` para ver el contrato OpenAPI de la API.

Para detener PostgreSQL al terminar:

```bash
docker compose down
```

## Arquitectura
Modular Monolith:
- `apps/web`: frontend Next.js.
- `apps/api`: backend NestJS.
- PostgreSQL como fuente de verdad.
- Prisma como ORM.
- Procesamiento IA on-demand.
- DeepSeek como primer proveedor mediante adapter.
- Object Storage S3-compatible preparado, pero incorporar solo cuando el MVP lo necesite.

## Evolución prevista
Etapa 2:
- Integración con Authentico.
- Multiusuario.
- Roles/perfiles.
- Storage externo.
- Procesamiento asíncrono si las métricas lo justifican.

Etapa posterior:
- Evaluar modelo SaaS o lifetime.
- Evaluar cache/colas/workers según necesidades reales.

## Deploy en Coolify

Coolify es la plataforma prevista para producción. El MVP se despliega en un único servidor como varios servicios independientes:

| Servicio | Origen | Puerto | Detalle |
| --- | --- | --- | --- |
| web | `apps/web` | 3000 | Frontend Next.js |
| api | `apps/api` | 3001 | Backend NestJS, expuesto públicamente en `https://estudia-api.server.encaladadiaz.com` |
| postgres | Service de Coolify | 5432 | Base de datos PostgreSQL |
| storage | Service de Coolify (MinIO) o S3 externo | 9000 | Object Storage S3-compatible |

### Requisitos previos

Existe un `Dockerfile` por app (`apps/web/Dockerfile` y `apps/api/Dockerfile`) que:
- Usa pnpm como package manager (PNPM 12.3.4) con Node 22.
- Construye solo el workspace necesario dentro del monorepo (`pnpm --filter`).
- Ejecuta `prisma migrate deploy` antes de arrancar en el caso de `apps/api`.
- Expone el puerto correspondiente (3000 web, 3001 api).

Al ser un monorepo, cada recurso Coolify debe apuntar al repositorio completo: dejar **Base Directory** vacío (raíz del repo) y fijar **Dockerfile Location** a `apps/web/Dockerfile` o `apps/api/Dockerfile` según el recurso. El build context es toda la raíz para que pnpm resuelva el workspace y el lockfile.

### Servicios Coolify a crear

1. **Web standalone**
   - Recurso Application apuntando al mismo repositorio, con Dockerfile Location `apps/web/Dockerfile`.
   - Variables de entorno (build-time): `NEXT_PUBLIC_API_URL`, apuntando a la URL pública de la API: `https://estudia-api.server.encaladadiaz.com/api/v1` (sin trailing slash). Se incrusta en el bundle durante `next build`; cambiarla requiere un nuevo build.
   - Dominio público con HTTPS automático (Traefik es el proxy inverso de Coolify).

2. **API**
   - Recurso Application con Dockerfile Location `apps/api/Dockerfile`.
   - Variables de entorno: `DATABASE_URL`, `API_PORT`, `WEB_URL` (origen CORS), `AI_*` y `S3_*` según el proveedor.
   - Dominio público: `https://estudia-api.server.encaladadiaz.com`. El navegador llama a la API directamente (client-side fetch). CORS configurado mediante la variable `WEB_URL`.

Nota sobre `NEXT_PUBLIC_API_URL`: en el `.env.example` raíz está definida, pero el frontend no lee variables de la raíz: Next.js solo carga `.env` desde `apps/web/`, que no existe en desarrollo. Por eso localmente la web usa el valor por defecto `http://localhost:3001/api/v1` de `apps/web/lib/api.ts:62`. No hay que definirla en `apps/api/.env`; es responsabilidad del recurso web en Coolify.

3. **PostgreSQL**
   - Service `postgres:16-alpine` de Coolify.
   - Credenciales generadas por Coolify; apuntar `DATABASE_URL` de la API a este servicio.

4. **Storage**
   - Service MinIO en el mismo servidor, o un bucket S3 externo (Backblaze B2/Contabo).
   - Configurar `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` y `S3_FORCE_PATH_STYLE` en la API sin tocar los casos de uso.

### Flujo de deploy

1. Push a la rama de producción dispara un nuevo build en Coolify.
2. Coolify construye la imagen desde el Dockerfile y publica el puerto.
3. Antes de arrancar la API, se ejecuta `prisma migrate deploy` para aplicar migraciones.
4. Coolify emite el certificado HTTPS automáticamente para `apps/web`.
5. El frontend consume la API desde el navegador mediante el FQDN público (`https://estudia-api.server.encaladadiaz.com/api/v1`). Es un fetch client-side; `app/page.tsx` usa `"use client"`.

### Notas

- No mezclar el `docker-compose.yml` de desarrollo con el deploy; en producción cada servicio se gestiona desde Coolify.
- El S3 en producción solo cambia variables de entorno; los casos de uso no se modifican.
- Si más adelante el procesamiento on-demand resulta lento, se introduce la cola/worker sin tocar dominio ni aplicación.
