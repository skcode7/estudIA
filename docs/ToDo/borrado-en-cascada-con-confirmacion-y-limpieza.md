# Requerimiento: borrado en cascada con confirmación y limpieza de storage

## Contexto

Borrar una materia arrastra en cascada temas, materiales, preguntas, quizzes e intentos (`apps/api/prisma/schema.prisma`). Hoy el diálogo de borrado (`apps/web/components/dialogs/delete-subject-dialog.tsx`) solo muestra el nombre y una advertencia genérica de que no se puede deshacer; no dice cuántos temas, materiales ni quizzes se perderán.

Además, el object storage no se limpia al borrar materias o temas. Solo `DeleteMaterialUseCase` borra el binario original y las figuras de un material suelto (`apps/api/src/modules/materials/application/use-cases/delete-material.use-case.ts:23-39`), y ni siquiera incluye el `analysis.json` que `ProcessMaterialUseCase` deposita junto al material (`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:282-297`). `DeleteSubjectUseCase` y `DeleteTopicUseCase` borran la fila y dejan el bucket intacto.

## Objetivo

Que el usuario vea, antes de confirmar, cuántos recursos se perderán, y que borrar una materia, un tema o un material deje el bucket sin los objetos asociados, sin bloquear el borrado de la fila si S3 falla.

## Alcance propuesto

### Backend

- `GetSubjectUseCase` / DTO de detalle con conteos (temas, materiales, preguntas, quizzes) o un endpoint dedicado `GET /subjects/:id/deletion-preview`.
- Puerto de materiales (o un servicio de limpieza de storage) que liste claves por `topicId` / `subjectId`.
- `DeleteSubjectUseCase` y `DeleteTopicUseCase`: recoger las `storageKey` de materiales e imágenes (y las claves de `analysis.json`) antes de la cascada de Prisma, e intentar borrarlas después.
- `DeleteMaterialUseCase`: añadir la clave de `analysis.json` a las que ya borra.
- Tests con mock de `ObjectStorage` que verifiquen las claves pedidas.

### Frontend

- `delete-subject-dialog.tsx`: listar lo que se va a borrar (temas, materiales, quizzes) y un texto explícito de que se pierden materiales y progreso.
- Opcional: exigir escribir el nombre de la materia para confirmar cuando hay materiales.
- Cliente API para el preview o el detalle enriquecido.

## Fuera de alcance (por ahora)

- Recolector periódico de huérfanos.
- Transacción distribuida DB + S3; sigue siendo best-effort.
- Papelera / borrado lógico.
- Unicidad de nombres de materia/tema.

## Notas

- Este ToDo unifica dos requerimientos que operan sobre el mismo flujo de borrado:
  - `docs/ToDo/confirmar-borrado-en-cascada.md`
  - `docs/ToDo/limpiar-storage-al-borrar-cascada.md`
- Hallazgos del wiki: `wiki/components/catalogo.md`, `wiki/decisions/storage-s3-minio.md`, `wiki/log.md`.
- Coherencia con AGENTS.md: mobile-first y amigable; abstracción `ObjectStorage`; no introducir Redis ni workers.
- Relacionado: el logging del error original en fallos de S3/DeepSeek ya está implementado en `create-file-material.use-case.ts`, `process-material.use-case.ts`, `model-output.ts` y `deepseek.client.ts` (ver historial).
