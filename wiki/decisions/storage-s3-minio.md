---
title: Object Storage S3-compatible con MinIO en local
type: decision
responsibility: Por qué los archivos de los materiales viven en un object storage S3-compatible y por qué el entorno local corre MinIO en vez de guardar binarios en disco o en Postgres.
options: Sistema de archivos del servidor · binarios en PostgreSQL · S3-compatible configurable por entorno
sources:
  - requirements/ADR-0001-MVP-SIMPLICITY.md
  - apps/api/src/modules/storage/application/ports/object-storage.ts
  - apps/api/src/modules/storage/object-storage.module.ts
  - apps/api/src/infrastructure/object-storage/s3.object-storage.ts
  - docker-compose.yml
  - apps/api/src/modules/materials/application/use-cases/delete-material.use-case.ts
synced: 36ec39f
confidence: high
related:
  - ../components/materiales.md
  - ../concepts/puertos-y-adapters.md
---

# Object Storage S3-compatible con MinIO en local

Los materiales del MVP incluyen fotos de apuntes y sus figuras recortadas, y tienen que poder
vivir en producción (Coolify, un S3 real) sin que el código se entere. La decisión (ADR-0001) fue
un puerto `ObjectStorage` con implementación S3, y MinIO como S3 de desarrollo.

## Qué se decidió

`ObjectStorage` (`apps/api/src/modules/storage/application/ports/object-storage.ts:12`) es el
único acceso a binarios: `upload`, `delete`, `getObject` y una `getSignedUrl` reservada para
cuando haga falta. La implementación usa el SDK de AWS contra cualquier endpoint S3, y **todo su
configurable está en variables de entorno**: endpoint, región, credenciales, bucket y
`forcePathStyle` (`apps/api/src/infrastructure/object-storage/s3.object-storage.ts:17`). Pasar de
MinIO a Backblaze B2 o Contabo es cambiar `.env`, no código. El binding vive en un módulo
`@Global()` que exporta el puerto (`apps/api/src/modules/storage/object-storage.module.ts:6`), de
modo que materiales lo inyecta sin declarar dependencias de módulo.

En local, `docker-compose.yml` levanta MinIO y un servicio `minio-init` que crea el bucket
`estudia-materials` (`docker-compose.yml:39`): S3 no crea buckets por sí solo, y sin ese contenedor
la primera subida falla con un error poco claro. La imagen está fijada por tag en quay.io
(`docker-compose.yml:21`) — el commit `c9ae336` arregló un deploy roto por una imagen que cambió
bajo los pies de la build.

## Lo que se descartó

**Guardar los binarios en el sistema de archivos del servidor.** Funciona en el portátil y muere en
Coolify, donde el contenedor se reconstruye; además ata la API a una sola máquina. **Guardarlos en
PostgreSQL** (bytea) habría simplificado el backup inicial, pero el tamaño de las fotos crece
rápido, la base se hace lenta y sacar los bytes hacia un CDN o un bucket se vuelve un proyecto.

## Consecuencias

- El dominio no conoce a AWS: los casos de uso reciben el puerto (ver
  [Puertos y adaptadores](../concepts/puertos-y-adapters.md)) y el SDK solo se importa en
  `infrastructure/object-storage`. Ese movimiento fue un refactor explícito: el commit `99070e5`
  subió el puerto a `application`.
- La limpieza de objetos es **best-effort**: borrar un material intenta borrar sus objetos y sigue
  si falla (`apps/api/src/modules/materials/application/use-cases/delete-material.use-case.ts:31`),
  y borrar una materia entera no limpia nada en el bucket. Con el tiempo aparecerán objetos
  huérfanos; conviene aceptarlo ahora y no construir un recolector que el MVP no necesita.
- `getSignedUrl` está declarada y implementada pero nadie la llama: las imágenes salen por la API.
  Es la puerta prevista para servir assets directamente desde el bucket si el tráfico lo pide.

## Cuándo revisarla

Cuando el despliegue deje de ser local, fijando solo variables de entorno. Y si el coste o la
latencia de servir imágenes por la API se nota, probar `getSignedUrl` antes que meter un CDN.
