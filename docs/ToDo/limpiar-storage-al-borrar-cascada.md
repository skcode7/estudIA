# Requerimiento: limpiar el object storage al borrar materia o tema

## Contexto

Solo `DeleteMaterialUseCase` limpia objetos del bucket (`apps/api/src/modules/materials/application/use-cases/delete-material.use-case.ts`): borra la fila y después intenta borrar el binario original y las figuras, uno a uno. Un objeto que no se pueda borrar solo se loguea; la fila ya no existe.

`DeleteSubjectUseCase` (`apps/api/src/modules/subjects/application/use-cases/delete-subject.use-case.ts`) y `DeleteTopicUseCase` (`apps/api/src/modules/topics/application/use-cases/delete-topic.use-case.ts`) borran la fila y nada más. El resto lo hace PostgreSQL en cascada (`apps/api/prisma/schema.prisma`: `Topic` → `Material` → `MaterialImage`). El object storage no se entera: fotos, figuras y `analysis.json` quedan en MinIO/S3.

El wiki (`wiki/components/catalogo.md`, `wiki/decisions/storage-s3-minio.md`) lo señala como la vía más fácil de acumular basura en el bucket. La decisión de storage acepta huérfanos *best-effort* en el MVP, pero borrar una materia entera ni siquiera lo intenta.

## Objetivo

Que borrar una materia, un tema o un material deje el bucket sin los objetos de esos materiales (binario, figuras y `analysis.json`), sin bloquear el borrado de la fila si S3 falla.

## Alcance propuesto

- Al borrar materia o tema, resolver las `storageKey` de materiales e imágenes (y las claves de `analysis.json`) **antes** de la cascada de Prisma, e intentar borrarlas después.
- Reutilizar la limpieza best-effort de `DeleteMaterialUseCase` (loguear y seguir si un objeto falla).
- Incluir el `analysis.json` que `ProcessMaterialUseCase` deposita junto al material y que hoy no entra en la lista de claves al borrar un material suelto.

## Cambios implicados

### Backend
- Puerto de materiales (o un servicio de limpieza de storage) que liste claves por `topicId` / `subjectId`.
- `DeleteSubjectUseCase` y `DeleteTopicUseCase`: recoger claves, borrar filas, luego objetos.
- `DeleteMaterialUseCase`: añadir la clave de `analysis.json` a las que ya borra.
- Tests con mock de `ObjectStorage` que verifiquen las claves pedidas.

### Frontend
- Sin cambios.

## Fuera de alcance (por ahora)

- Recolector periódico de huérfanos (el wiki lo descarta para el MVP).
- Transacción distribuida DB + S3; sigue siendo best-effort.
- Confirmación de cascada en la UI (`docs/ToDo/confirmar-borrado-en-cascada.md`).

## Notas

- Hallazgo del wiki: `wiki/components/catalogo.md`, `wiki/decisions/storage-s3-minio.md`, `wiki/log.md`.
- Coherencia con AGENTS.md: abstracción `ObjectStorage`; no introducir Redis ni workers.
- Relacionado: `docs/ToDo/logging-errores-originales.md` (fallos de S3 hoy se tragan el error original en otros flujos).
