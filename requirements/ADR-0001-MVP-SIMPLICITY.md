# ADR-0001 — Simplificar el MVP

## Estado
Aceptado

## Contexto
estudIA inicialmente podría incluir autenticación, Redis, workers y almacenamiento externo desde el comienzo. El usuario inicial será una sola persona y el objetivo es validar el producto.

Los materiales incluyen archivos, por lo que el MVP necesita un almacenamiento S3-compatible para desarrollarlos y probarlos localmente sin depender de un proveedor externo.

## Decisión
El MVP:
- no tendrá autenticación.
- no tendrá Redis.
- no tendrá workers.
- no tendrá BullMQ.
- no tendrá billing.
- usará procesos on-demand.
- tendrá DeepSeek detrás de una abstracción de proveedor.
- usará almacenamiento de objetos a través de la abstracción `ObjectStorage` (S3-compatible). En el entorno local el proveedor será **MinIO** (levantado con el docker compose), y en producción el proveedor real (Backblaze B2, Contabo u otro S3) se configurará únicamente por variables de entorno, sin tocar los casos de uso.

## Consecuencia
La primera versión será más sencilla de desarrollar y desplegar.

Las futuras necesidades deben incorporarse cuando exista evidencia que las justifique.
