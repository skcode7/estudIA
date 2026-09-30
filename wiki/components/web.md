---
title: Aplicación web (Next.js)
type: entity
responsibility: Dueño de la interfaz: una sola página client-side que compone vistas y diálogos, sus hooks de estado y el cliente HTTP contra la API.
sources:
  - apps/web/app/page.tsx
  - apps/web/app/layout.tsx
  - apps/web/lib/api.ts
  - apps/web/lib/navigation.ts
  - apps/web/lib/subjects.ts
  - apps/web/hooks/use-user.ts
  - apps/web/hooks/use-materials.ts
  - apps/web/components/dialogs/material-dialog.tsx
  - apps/web/components/views/materials-view.tsx
  - apps/web/components/dialogs/material-edit-dialog.tsx
  - apps/web/components/dialogs/material-delete-dialog.tsx
synced: 2375f47
related:
  - ../components/catalogo.md
  - ../flows/procesamiento-de-material.md
  - ./armazon-y-primitivas.md
  - ./vistas-de-catalogo.md
---

# Aplicación web (Next.js)

`apps/web` es una SPA montada sobre Next.js: una página, `app/page.tsx`, que decide qué vista se
ve y dónde viven los diálogos. No hay rutas de Next, ni server components, ni capa de caché: todo
es cliente y todo se pide a la API al montar cada vista.

## Una página, muchas vistas

`HomePage` (`apps/web/app/page.tsx:20`) mantiene `activeView` y conmuta entre `HomeView`,
`SubjectsView`, `MaterialsView` y `QuizView` (`apps/web/app/page.tsx:64`). Los diálogos — crear
materia, editar, borrar, agregar material, onboarding de usuario — viven en el mismo nivel que las
vistas y se abren por estado (`apps/web/app/page.tsx:103`), no por ruta.

La consecuencia práctica: **la URL no dice dónde estás**. Recargar la página vuelve siempre a
Inicio, y un quiz en curso o un borrador de material se pierden, porque su estado vive solo en el
componente. Es también lo que hace que la app funcione como app móvil: nada que enrutar.

## Dialogos que una vista abre desde dentro

La misma vista que lista materiales también puede crear uno, y para eso la página le pasa el
`openMaterialDialog` del hook (`apps/web/app/page.tsx:91`). Abrirlo desde Materiales lleva la
materia y el tema que ya están filtrados, así que `useMaterials.open` acepta opciones de
preselección en vez de no admitir argumentos
(`apps/web/hooks/use-materials.ts:19`) y el diálogo las aplica al cargar los temas
(`apps/web/components/dialogs/material-dialog.tsx:83`). El botón global del FAB sigue funcionando
igual: la preselección solo se aplica cuando viene.

El alta vive en un diálogo de la página, no en la vista, y la vista no se entera del resultado. Se
resuelve con un contador, hoy propiedad de `useMaterials`: la página lo incrementa al crear
(`apps/web/app/page.tsx:142`) y el propio hook lo vuelve a incrementar cuando termina cada proceso
(`apps/web/hooks/use-materials.ts:56`). `MaterialsView` lo usa como dependencia del efecto que lista
(`apps/web/components/views/materials-view.tsx:100`). Es un patrón de recarga por señal, no un
gestor de caché: la web no tiene invalidación de datos más allá de eso.

Que el contador viva en el hook y no en la página es consecuencia del procesamiento en segundo plano:
si el estado estuviera arriba del componente que lo dispara, recargar la vista perdería la señal del
material que sigue procesándose.

## Estado: hooks cortos, composición en la página

Tres hooks reúnen los datos y sus estados de carga y error: `useUser`, `useSubjects` y
`useMaterials`. Cada uno expone funciones ya cerradas que las vistas disparan; la página es quien
los compone (por ejemplo, crear una materia preselecciona esa materia en el diálogo de material,
`apps/web/app/page.tsx:38`). No hay store global ni React Query: si dos vistas necesitan lo mismo,
la página se lo pasa por props.

Desde `4fe2f8a` `useMaterials` dejó de ser solo el dueño del diálogo: también lo es del **procesamiento
en vuelo y de la señal de recarga**, que antes eran estado suelto de la página. Lo que motivó el
cambio es que el procesamiento no termina cuando el popup se cierra, así que su estado tiene que
vivir por encima de la vista que lo dispara. `startProcessing` envuelve el `processMaterial` y traga
el error a propósito (`apps/web/hooks/use-materials.ts:46`): el fallo habitual ya viene como material
`FAILED` y lo enseña la propia lista, y swallowar aquí evita un rechazo sin manejar en un `void`.

La navegación (`apps/web/lib/navigation.ts:1`) anuncia ya siete destinos; tres de ellos — Repaso,
Progreso e Insignias (`apps/web/lib/navigation.ts:6`) — caen en un placeholder
(`apps/web/app/page.tsx:99`) porque aún no hay nada que mostrar.

## El cliente HTTP

`lib/api.ts` es el único punto que habla con la API. Un `request` común resuelve la base desde
`NEXT_PUBLIC_API_URL` (`apps/web/lib/api.ts:71`), pasa `FormData` tal cual para las subidas
(`apps/web/lib/api.ts:85`) y convierte cualquier error HTTP en un `Error` con el mensaje que
devolvió Nest — `message` puede ser string o array y se normaliza a texto
(`apps/web/lib/api.ts:73`). Ese mensaje es el que ve el usuario en rojo: la API escribe los
mensajes de error pensando en la pantalla.

Desde `9342e58` el `request` tolera respuestas sin cuerpo: un `DELETE` de Nest no devuelve JSON, y
un `response.json()` a secas rompía con el borrado de materiales
(`apps/web/lib/api.ts:98`). Cualquier método que conteste `204` o con cuerpo vacío resuelve
`undefined` en vez de lanzar.

Las imágenes de preguntas se resuelven con `assetUrl`, que solo antepone la base de la API
(`apps/web/lib/api.ts:290`): la web nunca ve el bucket.

## Editar un material y lo que tiene debajo

El diálogo de edición dejó de ser un formulario de dos campos: desde `95b7a11` lleva el nombre de
la materia en el propio título (`apps/web/components/dialogs/material-edit-dialog.tsx:46`) y bajo
los campos de título y contenido hay dos pestañas —Preguntas e Imágenes— controladas con estado
local, sin router (`apps/web/components/dialogs/material-edit-dialog.tsx:41`). Ambas se cargan al
abrir, con una sola llamada al par de endpoints.

La pestaña de preguntas es la que hace útil el diálogo: lista cada una con sus opciones, marca la
correcta y permite editar enunciado, explicación y opciones, o eliminar con una confirmación que
avisa de que arrastra quizzes. Al borrar, el diálogo avisa a la vista con `onQuestionsChanged` y el
conteo de la fila se actualiza sin volver a listar (`apps/web/components/views/materials-view.tsx:337`).
La de imágenes es de solo consulta, y el binario sale de `assetUrl` contra la ruta de la figura.

Borrar el material entero tiene su propio diálogo
(`apps/web/components/dialogs/material-delete-dialog.tsx:7`), que sigue el patrón de
`DeleteSubjectDialog`: nombre de la materia, aviso de que no se puede deshacer, y un texto que sí
es honesto sobre lo que sobrevive —las preguntas del tema se quedan— aunque el borrado en cascada
de lo demás todavía no avisa de su tamaño (`docs/ToDo/confirmar-borrado-en-cascada.md`).

Es el reverso de que reprocesar sea destructivo: corregir a mano es la salida que hoy no destruye
el historial de intentos (ver [Módulo de quizzes](../components/quizzes.md)).

El diálogo avisa de que editar el contenido deja las preguntas viejas: es la Fase 1 de
`docs/ToDo/ciclo-vida-preguntas-material.md` (`3fe7ee4`), y siendo la única defensa que existe por
ahora conviene leerlo como lo que es: el usuario ya está avisado, pero nada impide todavía que se
regenere por encima de un quiz ya resuelto. Desde `e02b72e` el mismo aviso menciona además que
reprocesar devuelve el título a la IA
(`apps/web/components/dialogs/material-edit-dialog.tsx:193`), que es la contrapartida de que la IA
deduzca siempre el título.

## Dos decisiones que se notan

**Los tipos del contrato están duplicados.** `ApiSubject`, `ApiMaterial`, `ApiQuiz`… se declaran en
`lib/api.ts` a mano, en paralelo con los DTOs de NestJS, y nada detecta que los dos se separen:
cambiar un DTO de la API exige ajustar también este archivo. Hasta `2375f47` el workspace declaraba
además los paquetes compartidos `@estudia/types` y `@estudia/validation`, que no importaba
nadie y eran placeholders vacíos. Ese commit los borró, y con ellos el `zod` de la web, que era una
dependencia directa sin un solo import. La duplicación del contrato sigue exactamente igual: la
opción de compartirlo en un paquete se descartó porque la API no lo importaría, y eso no habría
eliminado la copia, solo la habría movido de sitio.

**Lo que enseñan las tarjetas de materia es decorativo, y los dos ceros vienen del mismo sitio.**
`decorateSubject` fija `progress: 0` y `materials: 0` para cada materia
(`apps/web/lib/subjects.ts:23`), así que la barra de progreso y el contador de materiales son
constantes.

El del progreso ya está diagnosticado: el `TopicProgress` real se acumula en la API y no se expone
(ver [Módulo de quizzes](../components/quizzes.md), `docs/ToDo/exponer-progreso-basico.md`).

El del contador de materiales es **un bug, no una decisión**: existe código que lo calcula
(`refreshSubjectMaterialCount`, `apps/web/hooks/use-materials.ts:60`) y solo se dispara como efecto
secundario de crear un material *desde la vista de Materiales*
(`apps/web/app/page.tsx:141`). Al entrar en Inicio no se calcula nada, así que el número es 0 aunque
haya materiales, y se queda viejo en cualquier otro cambio. Además el cálculo es un N+1 —pide los
temas y luego `listMaterials` por cada tema—, lo que explica que un arreglo en el cliente sea un
parche: el dato tiene que venir de la API. Registrado en
`docs/ToDo/contador-materiales-tarjetas.md`, que además señala que los dos ceros son el mismo
defecto de diseño: decoration en el cliente donde debería haber dato.

## Límites de la interfaz

El onboarding toma el primer usuario de la lista (`apps/web/hooks/use-user.ts:21`), sin sesión ni
perfil: la misma instalación compartida entre dos navegadores muestra el mismo usuario. Y el
diálogo de material dispara el análisis con IA en cuanto se elige un archivo
(`apps/web/components/dialogs/material-dialog.tsx:201`), de modo que cada cambio de archivo cuesta
una llamada a la IA que el usuario percibe como espera antes de poder editar los campos.
