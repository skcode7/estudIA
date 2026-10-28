---
title: Módulo de materiales
type: entity
responsibility: Dueño del Material y de todo lo que cuelga de él: su ciclo de procesamiento con IA, sus figuras extraídas y sus preguntas.
sources:
  - apps/api/src/modules/materials/materials.module.ts
  - apps/api/src/modules/materials/presentation/controllers/materials.controller.ts
  - apps/api/src/modules/materials/application/ports/material.repository.ts
  - apps/api/src/modules/materials/application/ports/material-image.repository.ts
  - apps/api/src/modules/materials/application/ports/material-question.repository.ts
  - apps/api/src/modules/materials/application/ports/image-cropper.ts
  - apps/api/src/modules/materials/application/use-cases/delete-material.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/get-material.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/get-material-image.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/list-materials.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/update-material.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/list-material-questions.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/update-material-question.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/delete-material-question.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/list-material-images.use-case.ts
  - apps/api/src/modules/materials/infrastructure/prisma-material.repository.ts
  - apps/api/src/modules/materials/infrastructure/prisma-material-image.repository.ts
  - apps/api/prisma/schema.prisma
synced: a859db8
related:
  - ../flows/procesamiento-de-material.md
  - ../flows/figuras-embebidas.md
  - ../components/quizzes.md
---

# Módulo de materiales

El módulo más grande de la API y el que más cosas toca: Prisma, el object storage y dos modelos de
IA distintos. Es dueño de tres tablas — `Material`, `MaterialImage` y `Question` con sus opciones —
y de la verdad sobre el estado de procesamiento de cada material.

## Qué es un Material

`Material` (`apps/api/prisma/schema.prisma:70`) es un apunte de un tema: `TEXT` (el usuario pegó el
contenido) o `FILE` (un binario en el storage más una transcripción opcional). El tipo `LINK`
existe en el enum (`apps/api/prisma/schema.prisma:10`) pero no tiene ruta de creación: nada lo
produce hoy, y el procesamiento lo rechaza.

Tres atributos gobiernan el ciclo de vida: `processingStatus`
(`apps/api/prisma/schema.prisma:79`), `hasEmbeddedFigures`
(`apps/api/prisma/schema.prisma:77`) y `questionMode`
(`apps/api/prisma/schema.prisma:78`). `processingStatus` es la máquina de estados
`PENDING → PROCESSING → COMPLETED | FAILED` con `processingError` como mensaje legible para el
usuario. `hasEmbeddedFigures` decide si el procesamiento intenta extraer figuras de la foto.
`questionMode` elige cómo se generan las preguntas, y es una propiedad del material —no de la
materia—: dos materiales de una misma materia pueden tener modos distintos (ver
[Procesamiento de un material](../flows/procesamiento-de-material.md)).

## Cómo generar las preguntas (questionMode)

`questionMode` (`BASED_ON_MATERIAL` por defecto) se elige al crear el material y se persiste con él
en la misma fila (`apps/api/src/modules/materials/infrastructure/prisma-material.repository.ts:25`):
vive en el DTO de creación, validado con `@IsEnum`, y el controller lo pasa al caso de uso
(`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:95`). Solo tiene
dos valores cerrados, no un prompt libre:

- **`BASED_ON_MATERIAL`**: las preguntas se hacen sobre el contenido cargado, como antes. Es el
  default y reproduce literalmente el comportamiento anterior.
- **`SIMILAR_QUESTIONS`**: el material es una guía de ejercicios; el modelo lo usa solo como
  referencia de estructura y mecánica y genera preguntas nuevas con datos distintos, sin preguntar
  nunca por los valores concretos del material.

El modo viaja al prompt de generación a través del puerto de IA, junto con el nombre de materia y
tema (`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:141`); el
builder de prompts produce un system prompt distinto por modo. Cambiar el modo de un material ya
procesado no regenera las preguntas existentes.

## Los puertos y quién los implementa

El módulo se auto-cablea en `materials.module.ts` (`apps/api/src/modules/materials/materials.module.ts:47`)
y esa lista es el contrato de lo que necesita: los repositorios de material, imagen y pregunta (en
Prisma), `ImageCropper` (sharp), los repositorios de temas y materias — que **no** son suyos: se
importan de los módulos vecinos — y el puerto de IA a través del módulo `ai`. La config de
preguntas por material se inyecta como token propio
(`apps/api/src/modules/materials/materials.module.ts:54`) en vez de leer `process.env` dentro del
caso de uso.

## Las tres cadenas de datos

Un material procesado deja tres rastros que se mantienen juntos y se limpian juntos:

1. **El binario original**, con clave `topics/<topicId>/materials/<uuid><ext>`
   (`apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts:45`). Si
   `ObjectStorage.upload` falla, el caso de uso registra el error original junto a `key` y `bucket`
   antes de responder con el mismo `503` genérico (`apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts:55`).
2. **Las figuras** (`MaterialImage`), cada una con su `storageKey`, un `label` descriptivo y un
   `order` estable que las preguntas usan para referenciarlas
   (`apps/api/src/modules/materials/application/ports/material-image.repository.ts:17`). El puerto
   `replaceForMaterial` sustituye el conjunto entero
   (`apps/api/src/modules/materials/application/ports/material-image.repository.ts:20`): reprocesar
   no acumula.
3. **Las preguntas** (`Question` + `QuestionOption`), que pertenecen al tema pero recuerdan su
   material de origen. También se reemplazan en bloque
   (`apps/api/src/modules/materials/application/ports/material-question.repository.ts:50`).

Más un cuarto rastro invisible para la API: el `analysis.json` que `ProcessMaterialUseCase`
deposita junto al material en el storage.

## Borrar un material

`DeleteMaterialUseCase` borra primero la fila y después intenta limpiar el storage
(`apps/api/src/modules/materials/application/use-cases/delete-material.use-case.ts:25`): el binario
original y todas las figuras, uno a uno
(`apps/api/src/modules/materials/application/use-cases/delete-material.use-case.ts:31`). Un objeto
que no se pueda borrar solo se loguea; la fila ya no existe y el material queda borrado de todas
formas — el storage puede quedar con huérfanos si MinIO/S3 falla.

Las preguntas del material **sobreviven** al borrado: `sourceMaterialId` es `onDelete: SetNull`
(`apps/api/prisma/schema.prisma:153`), así que siguen en el pool de generación de quizzes sin
material de origen. Sus imágenes, en cambio, caen en cascada con el material
(`apps/api/prisma/schema.prisma:100`) y la referencia de imagen de la pregunta queda en `null`.
Borrar un material no es borrar su contenido generado.

## Servir una figura

`GET /materials/:id/images/:imageId` es la única puerta a las imágenes: `GetMaterialImageUseCase`
comprueba que la figura pertenece al material que se pide
(`apps/api/src/modules/materials/application/use-cases/get-material-image.use-case.ts:24`) y
devuelve siempre `image/webp`
(`apps/api/src/modules/materials/application/use-cases/get-material-image.use-case.ts:37`). No hay
URL firmada ni acceso directo al bucket.

## Límites y detalles que importan

- El tope de subida es 10 MB y vive en el controller
  (`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:51`); un
  archivo mayor lo corta Multer antes de llegar al caso de uso.
- Solo se procesan imágenes (JPG, PNG, GIF, WebP). Un PDF o un `.doc` se puede guardar como
  material, pero su procesamiento falla con un mensaje que dice qué tipos se aceptan.
- `questionCount` no es un campo del material: se calcula contando preguntas por material
  (`apps/api/src/modules/materials/application/ports/material-question.repository.ts:47`), y por eso
  un material recién creado responde `0` sin importar su estado.

## Leer y editar sin tocar el procesamiento

Los casos de uso de lectura devuelven el material **con** su conteo de preguntas, y el conteo se
resuelve en la misma consulta para toda la lista (`apps/api/src/modules/materials/application/use-cases/list-materials.use-case.ts:15`);
el detalle de uno solo hace lo propio (`apps/api/src/modules/materials/application/use-cases/get-material.use-case.ts:18`).
Editar es `PATCH` de título y/o contenido y devuelve de nuevo el conteo recalculado
(`apps/api/src/modules/materials/application/use-cases/update-material.use-case.ts:22`).

Editar el contenido **no** reprocesa nada: las preguntas generadas siguen correspondiéndose con el
texto que había cuando se procesó, y nada lo detecta. Un material editado sin reprocesar es una
fuente de preguntas desactualizadas, y reprocesar trae el otro problema descrito en
[Módulo de quizzes](../components/quizzes.md). La única forma coherente de corregir un material es
editar y volver a procesarlo, sabiendo lo que eso borra.

## Corregir una pregunta a mano

Como reprocesar es destructivo, desde `1b39eff` el módulo también deja corregir el resultado sin
volver a generarlo: cuatro rutas bajo el material — listar, editar y borrar preguntas, y listar las
figuras — cada una con su caso de uso.

Lo que las hace seguras es que **el material manda**: cada caso de uso comprueba primero que el
material existe, y el repositorio filtra por `sourceMaterialId` en lugar de por id suelto
(`apps/api/src/modules/materials/application/ports/material-question.repository.ts:53`). Editar o
borrar una pregunta de otro material no da un `404` ambiguo, da «no encontrada para este material».

`UpdateMaterialQuestionUseCase` (`apps/api/src/modules/materials/application/use-cases/update-material-question.use-case.ts:37`)
impone las reglas que la IA cumple por contrato pero que una edición manual podría romper: entre 2
y 6 opciones, ninguna vacía, y **exactamente una** correcta
(`apps/api/src/modules/materials/application/use-cases/update-material-question.use-case.ts:52`).
También valida que la imagen vinculada, si la hay, sea una figura de ese mismo material
(`apps/api/src/modules/materials/application/use-cases/update-material-question.use-case.ts:57`).
Guardar borra y recrea las opciones dentro de una transacción
(`apps/api/src/modules/materials/infrastructure/prisma-material-question.repository.ts:107`), y
`difficulty` e `imageId` se mantienen: editar el texto de una pregunta no rehace la figura que la
ilustra.

Las figuras se listan como metadatos (`id`, `label`, `order`) sin su binario
(`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:168`): el peso de
las imágenes sigue saliendo por la ruta de una en una. Borrar una pregunta **sí** arrastra sus
`QuizQuestion` y `Answer` por la misma cascada que reprocesar, y esto no tiene todavía arreglo
documentado — ver [Módulo de quizzes](../components/quizzes.md).

El recorte de figuras también es un puerto del módulo: `ImageCropper` declara solo
`cropToWebp` (`apps/api/src/modules/materials/application/ports/image-cropper.ts:14`) y sharp lo
implementa fuera de `modules/`, de modo que cambiar de librería de imagen no toca el caso de uso.
