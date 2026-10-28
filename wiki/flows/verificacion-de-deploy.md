---
title: Verificación de deploy de la API
type: flow
responsibility: Comprueba que la imagen de producción de la API arranque con migraciones y responda al endpoint de health usando una base local descartable.
trigger: Ejecutar `pnpm verify:deploy` desde la raíz del monorepo
sources:
  - scripts/verify-deploy.sh
  - package.json
  - apps/api/Dockerfile
  - apps/api/src/modules/health/presentation/controllers/health.controller.ts
  - apps/api/src/modules/health/application/use-cases/get-health.use-case.ts
synced: 7c7585a
related:
  - ../architecture.md
---

# Verificación de deploy de la API

`pnpm verify:deploy` ejecuta `scripts/verify-deploy.sh` (`package.json:21`) para validar el
contenedor real de producción, no solo el build de desarrollo. El script requiere Docker, `curl` y el
contenedor local `estudia-postgres` ya levantado; si falta, indica ejecutar `docker compose up -d`
(`scripts/verify-deploy.sh:23`).

## Secuencia

El script usa la base `estudia_verify_deploy`: primero elimina una anterior con ese mismo nombre y
crea una nueva en el PostgreSQL local (`scripts/verify-deploy.sh:30`). Después construye
`apps/api/Dockerfile` con la etiqueta `estudia/api:verify` y arranca un contenedor unido a
`estudia_default`, exponiendo `API_PORT` y pasándole un `DATABASE_URL` dirigido a esa base temporal
(`scripts/verify-deploy.sh:36`). La imagen de runtime ejecuta `prisma migrate deploy` antes de
`node dist/main` (`apps/api/Dockerfile:36`).

Una vez iniciado, se consulta `GET /api/v1/health` hasta 90 veces con dos segundos entre intentos
(`scripts/verify-deploy.sh:46`). El endpoint responde `{ status: "ok" }`
(`apps/api/src/modules/health/application/use-cases/get-health.use-case.ts:7`): confirma que Nest
levantó, pero no prueba consultas a PostgreSQL. Si no hay respuesta en 180 segundos, el script imprime
los últimos logs del contenedor y termina con error (`scripts/verify-deploy.sh:57`).

Un `trap` de salida intenta borrar el contenedor de verificación y eliminar `estudia_verify_deploy`
al terminar, tanto en éxito como en error (`scripts/verify-deploy.sh:16`). Como el nombre es fijo, el
script también elimina una base previa con ese nombre antes de crearla: no se debe usar esa base para
datos locales que se quieran conservar.
