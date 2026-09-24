---
title: Procesamiento de un material de estudio
type: flow
responsibility: Cómo un material pasa de foto o texto a material procesado con preguntas generadas, desde el diálogo de la web hasta los casos de uso de materiales.
trigger: El usuario elige un archivo en el diálogo "Agregar material" o pulsa "Agregar material"
sources:
  - apps/web/components/dialogs/material-dialog.tsx
  - apps/api/src/modules/materials/materials.module.ts
  - apps/api/src/modules/materials/presentation/controllers/materials.controller.ts
  - apps/api/src/modules/materials/application/use-cases/analyze-material-draft.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts
  - apps/api/src/modules/ai/application/ports/ai-provider.ts
synced: 36ec39f
related:
  - ./figuras-embebidas.md
  - ../architecture.md
---

# Procesamiento de un material de estudio

Un material entra por dos puertas (una foto/archivo, o texto pegado) y sale con un análisis y un
juego de preguntas. Hay dos momentos separados a propósito: **guardar** (rápido, sin IA) y
**procesar** (lento, con IA). El usuario puede dejar el material guardado y procesarlo después.

## 1 · Análisis del borrador, antes de guardar nada

En cuanto se elige un archivo, el diálogo lanza la extracción sin persistir nada
(`apps/web/components/dialogs/material-dialog.tsx:195` llama a `runExtraction`, que invoca
`analyzeMaterialDraft` en `apps/web/components/dialogs/material-dialog.tsx:173`). También hay un
botón "✨ Extraer con IA" para el texto pegado.

`POST /api/v1/materials/analyze` (`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:55`)
llega a `AnalyzeMaterialDraftUseCase`, que carga el catálogo real de materias y temas
(`apps/api/src/modules/materials/application/use-cases/analyze-material-draft.use-case.ts:58`) y se
lo pasa a la IA para que sugiera dónde encaja el material
(`apps/api/src/modules/materials/application/use-cases/analyze-material-draft.use-case.ts:65`).

Un texto sin imagen y una imagen no soportada son un `400`, no un intento fallido de IA
(`apps/api/src/modules/materials/application/use-cases/analyze-material-draft.use-case.ts:51`): solo
se analizan imágenes JPG, PNG, GIF y WebP. Si la IA falla, el resultado es un `503`
(`apps/api/src/modules/materials/application/use-cases/analyze-material-draft.use-case.ts:72`).

Las sugerencias de la IA no se aceptan tal cual: `resolveSuggestedIds` las valida contra el
catálogo y, cuando el tema sugerido pertenece a otra materia, **manda el tema** y corrige la
materia (`apps/api/src/modules/materials/application/use-cases/analyze-material-draft.use-case.ts:142`).
El borrador devuelve además `extractedContent` y la marca `hasEmbeddedFigures`
(`apps/api/src/modules/materials/application/use-cases/analyze-material-draft.use-case.ts:84`), que
el diálogo rellena en el formulario (`apps/web/components/dialogs/material-dialog.tsx:129`) y el
usuario puede ajustar antes de guardar.

## 2 · Guardar: rápido y sin IA

Al enviar el formulario hay dos caminos según haya archivo o solo texto
(`apps/web/components/dialogs/material-dialog.tsx:231`):

- **Texto** → `POST /api/v1/materials` → `CreateTextMaterialUseCase`, que solo valida que el tema
  exista y crea la fila.
- **Archivo** → `POST /api/v1/materials/upload` (multipart, tope de 10 MB en
  `apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:39`) →
  `CreateTextMaterialUseCase` no interviene: `CreateFileMaterialUseCase` sube el binario al object
  storage con clave `topics/<topicId>/materials/<uuid><ext>`
  (`apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts:40`) y
  guarda la fila con `storageKey`, `content` (si la transcripción ya vino del borrador) y
  `hasEmbeddedFigures` (`apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts:53`).

Si el storage falla, la petición falla con `503` y **no queda fila creada**
(`apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts:50`). El
material nace con `processingStatus: PENDING` y `questionCount: 0`.

## 3 · Procesar: el estado y las fases

`POST /api/v1/materials/:id/process` dispara `ProcessMaterialUseCase`
(`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:133`). El estado
avanza por `PENDING → PROCESSING → COMPLETED`, y cualquier error cae a `FAILED` con un mensaje
legible: `fail()` marca el estado y devuelve `questionCount: 0`
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:299`).

```
findById ──► PROCESSING (:71) ──► cargar contenido ──► analyzeMaterial (:93)
    ──► actualizar título/contenido/hasEmbeddedFigures (:107)
    ──► guardar analysis.json (:122) ──► extraer figuras (:124)  ──► generateQuestions (:129)
    ──► replaceForMaterial (:136) ──► COMPLETED (:144)
```

Un material de texto sin contenido y un tipo no procesable (por ejemplo `LINK`) son `FAILED`
directos, sin llamar a la IA (`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:76`).
Para un archivo se relee el binario del storage; si la extensión no es una imagen soportada, el
proceso falla con un mensaje que dice qué tipos se procesan hoy
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:163`).

El análisis de la IA puede sobrescribir título y contenido del material solo si difieren de lo
guardado (`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:107`), y
la marca de figuras es *pegajosa*: una vez `true`, no vuelve a `false`
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:114`). El
análisis completo se conserva como `analysis.json` junto al material en el storage
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:287`): un fallo
al guardarlo solo se loguea y el proceso sigue.

## 4 · Preguntas

Con el análisis en la mano, el caso de uso pide `count` preguntas al puerto de IA — el número viene
de `AI_QUESTIONS_PER_MATERIAL`, inyectado como config
(`apps/api/src/modules/materials/materials.module.ts:46`) — y las sustituye todas por las nuevas:
`replaceForMaterial` no acumula, reemplaza
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:136`). Si el
material tenía figuras extraídas, sus pistas viajan junto a la petición para que alguna pregunta
pueda ser "¿qué es esta imagen?"; el detalle está en [Figuras embebidas](./figuras-embebidas.md).

El conteo que responde el endpoint es el que devuelve el repositorio de preguntas, no el que se
pidió (`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:145`).

## Lo que este flujo deja fuera

No hay cola ni worker: el `POST process` corre en la petición HTTP y puede tardar lo que tarde el
proveedor de IA. Reprocesar un material ya procesado vuelve a generar sus preguntas desde cero.
