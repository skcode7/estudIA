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
synced: a859db8
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
(`apps/web/app/page.tsx:147`), porque puede tardar lo que tarde el proveedor. La página lo lanza
con `void` y no espera, así que el usuario ve aparecer el material antes de que tenga preguntas.
El botón "Procesar" de la lista sobrevive y sigue siendo la salida para reintentar un `PENDING` o un
`FAILED`.

## 1 · Análisis del borrador, antes de guardar nada

En cuanto se elige un archivo, el diálogo lanza la extracción sin persistir nada
(`apps/web/components/dialogs/material-dialog.tsx:225` llama a `runExtraction`, que invoca
`analyzeMaterialDraft` en `apps/web/components/dialogs/material-dialog.tsx:200`). También hay un
botón «Extraer con IA» para el texto pegado.

El diálogo acepta varias fotos en secuencia: la primera establece las sugerencias iniciales y cada
foto adicional suma su texto extraído sin cambiar materia, tema ni título (`material-dialog.tsx:142`).
Solo la primera imagen se envía y se conserva como binario del material; la interfaz advierte esta
limitación (`apps/web/components/dialogs/material-dialog.tsx:386`).

`POST /api/v1/materials/analyze` (`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:71`)
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
el diálogo rellena en el formulario (`apps/web/components/dialogs/material-dialog.tsx:142`) y el
usuario puede ajustar antes de guardar.

## 2 · Guardar: rápido y sin IA

Al enviar el formulario hay dos caminos según haya archivo o solo texto
(`apps/web/components/dialogs/material-dialog.tsx:277`). La fila nace `PENDING` y es la página la que
dispara el procesamiento detrás, así que guardar y procesar son dos peticiones que el usuario nunca
llega a ver separadas:

- **Texto** → `POST /api/v1/materials` → `CreateTextMaterialUseCase`, que solo valida que el tema
  exista y crea la fila.
- **Archivo** → `POST /api/v1/materials/upload` (multipart, tope de 10 MB en
  `apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:51`) →
  `CreateTextMaterialUseCase` no interviene: `CreateFileMaterialUseCase` sube el binario al object
  storage con clave `topics/<topicId>/materials/<uuid><ext>`
  (`apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts:45`) y
  guarda la fila con `storageKey`, `content` (si la transcripción ya vino del borrador),
  `hasEmbeddedFigures` (`apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts:71`)
  y `questionMode` (`apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts:72`).

Si el storage falla, la petición falla con `503` y **no queda fila creada**
(`apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts:62`). Antes de
devolver el mismo error genérico, el caso de uso registra el error original junto a la key y el bucket
(`apps/api/src/modules/materials/application/use-cases/create-file-material.use-case.ts:55`). El
material nace con `processingStatus: PENDING` y `questionCount: 0`.

## 3 · Procesar: el estado y las fases

`POST /api/v1/materials/:id/process` dispara `ProcessMaterialUseCase`
(`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:188`). El estado
avanza por `PENDING → PROCESSING → COMPLETED`, y cualquier error cae a `FAILED` con un mensaje
legible: `fail()` marca el estado y devuelve `questionCount: 0`
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:315`).

```
findById ──► PROCESSING ──► cargar contenido ──► analyzeMaterial
    ──► actualizar título/contenido/hasEmbeddedFigures
    ──► guardar analysis.json ──► extraer figuras ──► buscar materia/tema ──► generateQuestions
    ──► replaceForMaterial ──► COMPLETED
```

Un material de texto sin contenido y un tipo no procesable (por ejemplo `LINK`) son `FAILED`
directos, sin llamar a la IA (`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:80`).
Para un archivo se relee el binario del storage; si la extensión no es una imagen soportada, el
proceso falla con un mensaje que dice qué tipos se procesan hoy
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:179`).
Si la lectura de `ObjectStorage` falla, el caso de uso registra `storageKey`, mensaje original y stack
antes de guardar en el material el mismo error genérico para el usuario
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:169`).

El título se sobrescribe **sin condiciones** en cuanto la IA propone uno
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:111`); el contenido
solo se actualiza si difiere del guardado. La marca de figuras es *pegajosa*: una vez `true`, no
vuelve a `false` (`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:118`).
El análisis completo se conserva como `analysis.json` junto al material en el storage
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:303`): un fallo
al guardarlo solo se loguea y el proceso sigue.

### El título lo pone la IA, y por qué antes no

El diálogo rellena el campo de título con el **nombre del archivo** en cuanto se elige
(`apps/web/components/dialogs/material-dialog.tsx:222`), así que si la IA no propone título, lo que se
guarda es `IMG-20240315-WA0037.jpg`. No era un fallo del modelo: la regla del prompt pedía el título
*"vacío si el material ya tiene uno claro"* y el formato lo declaraba opcional, de modo que el modelo
se tomaba esa puerta de salida y solo la tomaba a veces — medido, 1 de cada 4 llamadas. Desde
`171e86b` la regla exige inferirlo siempre, usando el encabezado visible de la foto, y prohíbe
copiar el nombre del archivo. Con el prompt anterior: 1 de 4 vacíos; con el nuevo, 0 de 8.

El coste de que la IA mande sobre el título es que un título escrito a mano se pierde al reprocesar.
El aviso del diálogo de edición lo dice desde `e02b72e`
(`apps/web/components/dialogs/material-edit-dialog.tsx:194`).

## 4 · Preguntas

Con el análisis en la mano, el caso de uso pide `count` preguntas al puerto de IA — el número viene
de `AI_QUESTIONS_PER_MATERIAL`, inyectado como config
(`apps/api/src/modules/materials/materials.module.ts:54`) — y las sustituye todas por las nuevas:
`replaceForMaterial` no acumula, reemplaza
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:146`). Si el
material tenía figuras extraídas, sus pistas viajan junto a la petición para que alguna pregunta
pueda ser "¿qué es esta imagen?"; el detalle está en [Figuras embebidas](./figuras-embebidas.md).

Antes de pedir las preguntas, el caso de uso resuelve la materia y el tema del material —busca el
tema y, con su `subjectId`, la materia— y pasa esos nombres a la IA junto con el modo del material
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:130`); si el tema
no existe, los nombres se omiten sin romper el procesamiento. El modo (`questionMode`) cambia el
system prompt: `BASED_ON_MATERIAL` pide preguntas sobre el contenido, y `SIMILAR_QUESTIONS` pide
ejercicios nuevos con la misma estructura que la guía (ver
[Módulo de materiales](../components/materiales.md)). El builder de prompts es una función pura de
`generateQuestionsSystemPrompt(mode)`, así que cada modo se puede testear sin llamar al proveedor.

El conteo que responde el endpoint es el que devuelve el repositorio de preguntas, no el que se
pidió (`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts:155`).

## Lo que este flujo deja fuera

No hay cola ni worker: el `POST process` corre en la petición HTTP y puede tardar lo que tarde el
proveedor de IA, y la web lo lanza sin esperarlo desde el popup. Reprocesar un material ya procesado
vuelve a generar sus preguntas desde cero.

En segundo plano la fila nace en `PENDING` y la lista la enseña con el botón "Procesar" ya
deshabilitado y el texto "Procesando…" (`apps/web/components/views/materials-view.tsx:299`), porque
`useMaterials` lleva los ids en vuelo y la vista los suma a su propio estado de proceso manual
(`apps/web/components/views/materials-view.tsx:266`). Ese estado vive en el hook y no en la vista, así
que sobrevive a que el usuario salga de Materiales y vuelva. Al terminar, `startProcessing` refresca el
listado sin importar si nadie lo está mirando
(`apps/web/hooks/use-materials.ts:46`).
