---
title: Figuras embebidas en una foto de apuntes
type: flow
responsibility: Cómo una foto de apuntes con banderas, mapas o diagramas acaba con esas figuras recortadas, guardadas y referenciadas por preguntas de imagen.
trigger: ProcessMaterialUseCase procesa un material FILE con hasEmbeddedFigures activo
sources:
  - apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts
  - apps/api/src/modules/materials/presentation/dto/materials.dto.ts
  - apps/api/src/modules/ai/ai.module.ts
  - apps/api/src/modules/ai/application/ports/image-extractor.ts
  - apps/api/src/modules/ai/application/ports/ai-provider.ts
  - apps/api/src/infrastructure/ai/openrouter/openrouter.image-extractor.ts
  - apps/api/src/infrastructure/images/sharp.image-cropper.ts
  - apps/api/src/modules/materials/presentation/controllers/materials.controller.ts
synced: 36ec39f
related:
  - ./procesamiento-de-material.md
  - ../decisions/proveedor-ia.md
---

# Figuras embebidas en una foto de apuntes

Los apuntes fotografiados suelen traer dibujos propios — banderas, mapas, esquemas — que el texto
no describe. Este flujo los saca de la foto, los guarda como imágenes independientes y permite que
las preguntas los usen ("¿a qué corresponde esta imagen?"). Es una cadena de **degradación
gradual**: cada paso que falla deja el material sin figuras, pero nunca rompe el procesamiento.

## El disparador: la marca `hasEmbeddedFigures`

La marca nace en el análisis del borrador: el modelo de texto dice si la foto tiene figuras propias
aparte del texto (`apps/api/src/modules/ai/application/ports/ai-provider.ts:41`). El usuario la ve
en el formulario y puede corregirla antes de guardar; viaja como string `"true"` desde un
multipart, y el DTO la normaliza a booleano
(`apps/api/src/modules/materials/presentation/dto/materials.dto.ts:55`). Durante el procesamiento
la marca es pegajosa: si el material ya la traía, un análisis nuevo no la quita
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:114`).

## La cadena

```
foto + hasEmbeddedFigures
  └─► MaterialImageExtractor.extractRegions   (modelo especialista de visión, OpenRouter)
        └─► por cada región (máx. 5):
              ImageCropper.cropToWebp          (sharp: recorte + 640px + WebP)
              ObjectStorage.upload             (.../images/<uuid>.webp)
        └─► MaterialImageRepository.replaceForMaterial   (fila MaterialImage por figura)
        └─► hints: [{index, label}] ──► AIProvider.generateQuestions
                                        └─► pregunta.imageIndex ──► MaterialQuestion.imageId
```

`ProcessMaterialUseCase.extractEmbeddedImages` orquesta todo
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:181`). Su
primera guarda decide si hay algo que hacer: sin imagen, sin marca o sin extractor disponible,
devuelve vacío y sigue el procesamiento normal
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:186`).

## Localizar las figuras

`MaterialImageExtractor` es un puerto aparte del de texto: un modelo "especialista" de visión que
devuelve **regiones**, no recortes (`apps/api/src/modules/ai/application/ports/image-extractor.ts:31`).
Cada región trae un `label` en el idioma del material ("bandera de Francia") y una caja en
coordenadas normalizadas 0–1 (`apps/api/src/modules/ai/application/ports/image-extractor.ts:1`), lo
que hace el recorte independiente del tamaño real de la foto. Se piden como mucho
`MAX_EXTRACTED_IMAGES` (5) regiones (`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:31`).

La implementación concreta pregunta a OpenRouter con el modelo de `IMAGE_EXTRACTION_MODEL` y
valida la salida con Zod antes de mapearla
(`apps/api/src/infrastructure/ai/openrouter/openrouter.image-extractor.ts:22`). Qué extractor se
inyecta lo decide `AIModule` una vez, al arrancar: con `OPENROUTER_API_KEY` usa el de OpenRouter y
sin ella usa `NoopMaterialImageExtractor` (`apps/api/src/modules/ai/ai.module.ts:25`). El noop
responde `false` a `isAvailable()` y devuelve cero regiones
(`apps/api/src/infrastructure/ai/noop.image-extractor.ts:12`), de modo que el material se procesa
igualmente con preguntas de solo texto y sin intentar ningún recorte. El `isAvailable()` del
adaptador de OpenRouter, en cambio, es `true` incondicional
(`apps/api/src/infrastructure/ai/openrouter/openrouter.image-extractor.ts:18`): si faltara la clave
y aun así estuviera inyectado, el corte llegaría cuando `extractRegions` lanza, y el `catch` del
caso de uso lo absorbería igual (`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:204`).

## Recortar y guardar

Cada región se recorta con `ImageCropper.cropToWebp`, que convierte la caja normalizada a píxeles
con las dimensiones reales (`apps/api/src/infrastructure/images/sharp.image-cropper.ts:19`), mete
un padding del 8 % antes de recortar
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:327`) y exporta
a WebP de hasta 640 px (`apps/api/src/infrastructure/images/sharp.image-cropper.ts:27`). El
resultado se sube a `topics/<topicId>/materials/<materialId>/images/<uuid>.webp`
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:253`).

Un recorte que falla se salta; si todos fallan, el material queda sin figuras
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:222`). Las
imágenes previas del material que no vuelven a aparecer se borran del storage
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:264`), de modo
que reprocesar no acumula huérfanos.

## De la figura a la pregunta

Las figuras guardadas se devuelven al generador como pistas `{index, label}`: el índice es estable
y se usa para atar la respuesta. `toQuestionInputs` traduce el `imageIndex` que devuelve el modelo
al `id` real de la fila `MaterialImage`
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:310`). Si el
modelo inventa un índice que no existe, la pregunta se guarda sin imagen en vez de fallar.

Para mostrarla, la web pide `GET /materials/:id/images/:imageId`
(`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:119`), que
devuelve el binario con caché privada de un día. Nunca hay URL pública del bucket.
