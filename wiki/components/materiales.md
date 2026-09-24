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
  - apps/api/src/modules/materials/application/use-cases/delete-material.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/get-material-image.use-case.ts
  - apps/api/prisma/schema.prisma
synced: 36ec39f
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

`Material` (`apps/api/prisma/schema.prisma:56`) es un apunte de un tema: `TEXT` (el usuario pegó el
contenido) o `FILE` (un binario en el storage más una transcripción opcional). El tipo `LINK`
existe en el enum (`apps/api/prisma/schema.prisma:10`) pero no tiene ruta de creación: nada lo
produce hoy, y el procesamiento lo rechaza.

Los dos atributos que gobiernan el ciclo de vida son `processingStatus`
(`apps/api/prisma/schema.prisma:64`) y `hasEmbeddedFigures` (`apps/api/prisma/schema.prisma:63`).
El primero es la máquina de estados `PENDING → PROCESSING → COMPLETED | FAILED` con
`processingError` como mensaje legible para el usuario. El segundo decide si el procesamiento
intenta extraer figuras de la foto.

## Los puertos y quién los implementa

El módulo se auto-cablea en `materials.module.ts` (`apps/api/src/modules/materials/materials.module.ts:39`)
y esa lista es el contrato de lo que necesita: los repositorios de material, imagen y pregunta (en
Prisma), `ImageCropper` (sharp), los repositorios de temas y materias — que **no** son suyos: se
importan de los módulos vecinos — y el puerto de IA a través del módulo `ai`. La config de
preguntas por material se inyecta como token propio
(`apps/api/src/modules/materials/materials.module.ts:46`) en vez de leer `process.env` dentro del
caso de uso.

## Las tres cadenas de datos

Un material procesado deja tres rastros que se mantienen juntos y se limpian juntos:

1. **El binario original**, con clave `topics/<topicId>/materials/<uuid><ext>`
   (`apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts:40`).
2. **Las figuras** (`MaterialImage`), cada una con su `storageKey`, un `label` descriptivo y un
   `order` estable que las preguntas usan para referenciarlas
   (`apps/api/src/modules/materials/application/ports/material-image.repository.ts:17`). El puerto
   `replaceForMaterial` sustituye el conjunto entero
   (`apps/api/src/modules/materials/application/ports/material-image.repository.ts:20`): reprocesar
   no acumula.
3. **Las preguntas** (`Question` + `QuestionOption`), que pertenecen al tema pero recuerdan su
   material de origen. También se reemplazan en bloque
   (`apps/api/src/modules/materials/application/ports/material-question.repository.ts:24`).

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
(`apps/api/prisma/schema.prisma:104`), así que siguen en el pool de generación de quizzes sin
material de origen. Sus imágenes, en cambio, caen en cascada con el material
(`apps/api/prisma/schema.prisma:85`) y la referencia de imagen de la pregunta queda en `null`.
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
  (`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:39`); un
  archivo mayor lo corta Multer antes de llegar al caso de uso.
- Solo se procesan imágenes (JPG, PNG, GIF, WebP). Un PDF o un `.doc` se puede guardar como
  material, pero su procesamiento falla con un mensaje que dice qué tipos se aceptan.
- `questionCount` no es un campo del material: se calcula contando preguntas por material
  (`apps/api/src/modules/materials/application/ports/material-question.repository.ts:23`), y por eso
  un material recién creado responde `0` sin importar su estado.
