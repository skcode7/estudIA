# ADR-0001 — Simplificar el MVP

## Estado
Aceptado

## Contexto
estudIA inicialmente podría incluir autenticación, Redis, workers y almacenamiento externo desde el comienzo. El usuario inicial será una sola persona y el objetivo es validar el producto.

## Decisión
El MVP:
- no tendrá autenticación.
- no tendrá Redis.
- no tendrá workers.
- no tendrá BullMQ.
- no tendrá MinIO.
- no tendrá billing.
- usará procesos on-demand.
- tendrá DeepSeek detrás de una abstracción de proveedor.

## Consecuencia
La primera versión será más sencilla de desarrollar y desplegar.

Las futuras necesidades deben incorporarse cuando exista evidencia que las justifique.
