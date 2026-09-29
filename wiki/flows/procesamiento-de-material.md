---
title: Procesamiento de un material de estudio
type: flow
responsibility: Cómo un material pasa de foto o texto a material procesado con preguntas generadas y título deducido, encadenando el diálogo, el proceso en segundo plano y los casos de uso de materiales.
trigger: El usuario elige un archivo en el diálogo "Agregar material" y lo confirma, o pulsa "Procesar" en un material ya guardado
sources:
  - apps/web/components/dialogs/material-dialog.tsx
  - apps/web/app/page.tsx
  - apps/web/hooks/use-materials.ts
  - apps/web/components/dialogs/material-edit-dialog.tsx
  - apps/api/src/modules/materials/materials.module.ts
  - apps/api/src/modules/materials/presentation/controllers/materials.controller.ts
  - apps/api/src/modules/materials/application/use-cases/analyze-material-draft.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts
  - apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts
  - apps/api/src/modules/ai/application/ports/ai-provider.ts
  - apps/api/src/infrastructure/ai/deepseek/deepseek.prompts.ts
  - apps/web/components/views/materials-view.tsx
synced: 6931a91
related:
  - ./figuras-embebidas.md
  - ../architecture.md
---

# Procesamiento de un material de estudio

Un material entra por dos puertas (una foto/archivo, o texto pegado) y sale con un análisis y un
juego de preguntas. En el backend hay dos momentos separados a propósito: **guardar** (rápido, sin
IA) y **procesar** (lento, con IA).

En la web ya no lo son. Desde `4fe2f8a` confirmar el diálogo encadena el procesamiento y el popup
cierra al guardar: el `POST /materials/:id/process` sigue en segundo plano
(`apps/web/app/page.tsx:144`), porque puede tardar lo que tarde el proveedor. La página lo lanza
con `void` y no espera, así que el usuario ve aparecer el material antes de que tenga preguntas.
El botón "Procesar" de la lista sobrevive y sigue siendo la salida para reintentar un `PENDING` o un
`FAILED`.

## 1 · Análisis del borrador, antes de guardar nada

En cuanto se elige un archivo, el diálogo lanza la extracción sin persistir nada
(`apps/web/components/dialogs/material-dialog.tsx:201` llama a `runExtraction`, que invoca
`analyzeMaterialDraft` en `apps/web/components/dialogs/material-dialog.tsx:179`). También hay un
botón "✨ Extraer con IA" para el texto pegado.

`POST /api/v1/materials/analyze` (`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:70`)
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
el diálogo rellena en el formulario (`apps/web/components/dialogs/material-dialog.tsx:135`) y el
usuario puede ajustar antes de guardar.

## 2 · Guardar: rápido y sin IA

Al enviar el formulario hay dos caminos según haya archivo o solo texto
(`apps/web/components/dialogs/material-dialog.tsx:237`). La fila nace `PENDING` y es la página la que
dispara el procesamiento detrás, así que guardar y procesar son dos peticiones que el usuario nunca
llega a ver separadas:

- **Texto** → `POST /api/v1/materials` → `CreateTextMaterialUseCase`, que solo valida que el tema
  exista y crea la fila.
- **Archivo** → `POST /api/v1/materials/upload` (multipart, tope de 10 MB en
  `apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:50`) →
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
(`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:185`). El estado
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

El título se sobrescribe **sin condiciones** en cuanto la IA propone uno
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:107`); el contenido
solo se actualiza si difiere del guardado. La marca de figuras es *pegajosa*: una vez `true`, no
vuelve a `false` (`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:114`).
El análisis completo se conserva como `analysis.json` junto al material en el storage
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:287`): un fallo
al guardarlo solo se loguea y el proceso sigue.

### El título lo pone la IA, y por qué antes no

El diálogo rellena el campo de título con el **nombre del archivo** en cuanto se elige
(`apps/web/components/dialogs/material-dialog.tsx:199`), así que si la IA no propone título, lo que se
guarda es `IMG-20240315-WA0037.jpg`. No era un fallo del modelo: la regla del prompt pedía el título
*"vacío si el material ya tiene uno claro"* y el formato lo declaraba opcional, de modo que el modelo
se tomaba esa puerta de salida y solo la tomaba a veces — medido, 1 de cada 4 llamadas. Desde
`171e86b` la regla exige inferirlo siempre, usando el encabezado visible de la foto, y prohíbe
copiar el nombre del archivo. Con el prompt anterior: 1 de 4 vacíos; con el nuevo, 0 de 8.

El coste de que la IA mande sobre el título es que un título escrito a mano se pierde al reprocesar.
El aviso del diálogo de edición lo dice desde `e02b72e`
(`apps/web/components/dialogs/material-edit-dialog.tsx:193`).

## 4 · Preguntas

Con el análisis en la mano, el caso de uso pide `count` preguntas al puerto de IA — el número viene
de `AI_QUESTIONS_PER_MATERIAL`, inyectado como config
(`apps/api/src/modules/materials/materials.module.ts:54`) — y las sustituye todas por las nuevas:
`replaceForMaterial` no acumula, reemplaza
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:136`). Si el
material tenía figuras extraídas, sus pistas viajan junto a la petición para que alguna pregunta
pueda ser "¿qué es esta imagen?"; el detalle está en [Figuras embebidas](./figuras-embebidas.md).

El conteo que responde el endpoint es el que devuelve el repositorio de preguntas, no el que se
pidió (`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:145`).

## Lo que este flujo deja fuera

No hay cola ni worker: el `POST process` corre en la petición HTTP y puede tardar lo que tarde el
proveedor de IA, y la web lo lanza sin esperarlo desde el popup. Reprocesar un material ya procesado
vuelve a generar sus preguntas desde cero.

En segundo plano la fila nace en `PENDING` y la lista la enseña con el botón "Procesar" ya
deshabilitado y el texto "Procesando…" (`apps/web/components/views/materials-view.tsx:299`), porque
`useMaterials` lleva los ids en vuelo y la vista los suma a su propio estado de proceso manual
(`apps/web/components/views/materials-view.tsx:264`). Ese estado vive en el hook y no en la vista, así
que sobrevive a que el usuario salga de Materiales y vuelva. Al terminar, `startProcessing` refresca el
listado sin importar si nadie lo está mirando
(`apps/web/hooks/use-materials.ts:46`).
