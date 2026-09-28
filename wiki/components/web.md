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
synced: 3fe7ee4
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
`SubjectsView`, `MaterialsView` y `QuizView` (`apps/web/app/page.tsx:65`). Los diálogos — crear
materia, editar, borrar, agregar material, onboarding de usuario — viven en el mismo nivel que las
vistas y se abren por estado (`apps/web/app/page.tsx:103`), no por ruta.

La consecuencia práctica: **la URL no dice dónde estás**. Recargar la página vuelve siempre a
Inicio, y un quiz en curso o un borrador de material se pierden, porque su estado vive solo en el
componente. Es también lo que hace que la app funcione como app móvil: nada que enrutar.

## Dialogos que una vista abre desde dentro

La misma vista que lista materiales también puede crear uno, y para eso la página le pasa el
`openMaterialDialog` del hook (`apps/web/app/page.tsx:92`). Abrirlo desde Materiales lleva la
materia y el tema que ya están filtrados, así que `useMaterials.open` acepta opciones de
preselección en vez de no admitir argumentos
(`apps/web/hooks/use-materials.ts:17`) y el diálogo las aplica al cargar los temas
(`apps/web/components/dialogs/material-dialog.tsx:83`). El botón global del FAB sigue funcionando
igual: la preselección solo se aplica cuando viene.

El alta vive en un diálogo de la página, no en la vista, y la vista no se entera del resultado. Se
resuelve con un contador: `page.tsx` lo incrementa al crear
(`apps/web/app/page.tsx:142`) y `MaterialsView` lo usa como dependencia del efecto que lista
(`apps/web/components/views/materials-view.tsx:98`). Es un patrón de recarga por señal, no un
gestor de caché: la web no tiene invalidación de datos más allá de eso.

## Estado: hooks cortos, composición en la página

Tres hooks reúnen los datos y sus estados de carga y error: `useUser`, `useSubjects` y
`useMaterials`. Cada uno expone funciones ya cerradas que las vistas disparan; la página es quien
los compone (por ejemplo, crear una materia preselecciona esa materia en el diálogo de material,
`apps/web/app/page.tsx:39`). No hay store global ni React Query: si dos vistas necesitan lo mismo,
la página se lo pasa por props.

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
conteo de la fila se actualiza sin volver a listar (`apps/web/components/views/materials-view.tsx:334`).
La de imágenes es de solo consulta, y el binario sale de `assetUrl` contra la ruta de la figura.

Borrar el material entero tiene su propio diálogo
(`apps/web/components/dialogs/material-delete-dialog.tsx:7`), que sigue el patrón de
`DeleteSubjectDialog`: nombre de la materia, aviso de que no se puede deshacer, y un texto que sí
es honesto sobre lo que sobrevive —las preguntas del tema se quedan— aunque el borrado en cascada
de lo demás todavía no avisa de su tamaño (`docs/ToDo/confirmar-borrado-en-cascada.md`).

Es el reverso de que reprocesar sea destructivo: corregir a mano es la salida que hoy no destruye
el historial de intentos (ver [Módulo de quizzes](../components/quizzes.md)).

Lo que **no** hace todavía el diálogo es avisar de que editar el contenido deja las preguntas
viejas. Ese aviso es la Fase 1 de `docs/ToDo/ciclo-vida-preguntas-material.md` (`3fe7ee4`), y siendo
la única defensa que existe por ahora conviene leerlo como lo que es: el usuario ya está avisado,
pero nada impide todavía que se regenere por encima de un quiz ya resuelto.

## Dos decisiones que se notan

**Los tipos del contrato están duplicados.** `ApiSubject`, `ApiMaterial`, `ApiQuiz`… se declaran en
`lib/api.ts` a mano, y los paquetes compartidos `@estudia/types` y `@estudia/validation` existen en
el workspace pero no los importa nadie todavía: son placeholders vacíos. Cambiar un DTO de la API
exige ajustar también este archivo.

**Lo que enseña como "progreso" es decorativo.** `decorateSubject` fija `progress: 0` y un mensaje
invariable para cada materia (`apps/web/lib/subjects.ts:23`): las tarjetas muestran una barra que
no refleja el `TopicProgress` que la API acumula. El dato real existe en el backend y aún no se
expone (ver [Módulo de quizzes](../components/quizzes.md)).

## Límites de la interfaz

El onboarding toma el primer usuario de la lista (`apps/web/hooks/use-user.ts:21`), sin sesión ni
perfil: la misma instalación compartida entre dos navegadores muestra el mismo usuario. Y el
diálogo de material dispara el análisis con IA en cuanto se elige un archivo
(`apps/web/components/dialogs/material-dialog.tsx:201`), de modo que cada cambio de archivo cuesta
una llamada a la IA que el usuario percibe como espera antes de poder editar los campos.
