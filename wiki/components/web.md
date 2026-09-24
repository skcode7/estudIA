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
synced: 36ec39f
related:
  - ../components/catalogo.md
  - ../flows/procesamiento-de-material.md
---

# Aplicación web (Next.js)

`apps/web` es una SPA montada sobre Next.js: una página, `app/page.tsx`, que decide qué vista se
ve y dónde viven los diálogos. No hay rutas de Next, ni server components, ni capa de caché: todo
es cliente y todo se pide a la API al montar cada vista.

## Una página, muchas vistas

`HomePage` (`apps/web/app/page.tsx:20`) mantiene `activeView` y conmuta entre `HomeView`,
`SubjectsView`, `MaterialsView` y `QuizView` (`apps/web/app/page.tsx:64`). Los diálogos — crear
materia, editar, borrar, agregar material, onboarding de usuario — viven en el mismo nivel que las
vistas y se abren por estado (`apps/web/app/page.tsx:100`), no por ruta.

La consecuencia práctica: **la URL no dice dónde estás**. Recargar la página vuelve siempre a
Inicio, y un quiz en curso o un borrador de material se pierden, porque su estado vive solo en el
componente. Es también lo que hace que la app funcione como app móvil: nada que enrutar.

## Estado: hooks cortos, composición en la página

Tres hooks reúnen los datos y sus estados de carga y error: `useUser`, `useSubjects` y
`useMaterials`. Cada uno expone funciones ya cerradas que las vistas disparan; la página es quien
los compone (por ejemplo, crear una materia preselecciona esa materia en el diálogo de material,
`apps/web/app/page.tsx:38`). No hay store global ni React Query: si dos vistas necesitan lo mismo,
la página se lo pasa por props.

La navegación (`apps/web/lib/navigation.ts:1`) anuncia ya siete destinos; tres de ellos — Repaso,
Progreso e Insignias (`apps/web/lib/navigation.ts:6`) — caen en un placeholder
(`apps/web/app/page.tsx:96`) porque aún no hay nada que mostrar.

## El cliente HTTP

`lib/api.ts` es el único punto que habla con la API. Un `request` común resuelve la base desde
`NEXT_PUBLIC_API_URL` (`apps/web/lib/api.ts:71`), pasa `FormData` tal cual para las subidas
(`apps/web/lib/api.ts:85`) y convierte cualquier error HTTP en un `Error` con el mensaje que
devolvió Nest — `message` puede ser string o array y se normaliza a texto
(`apps/web/lib/api.ts:73`). Ese mensaje es el que ve el usuario en rojo: la API escribe los
mensajes de error pensando en la pantalla.

Las imágenes de preguntas se resuelven con `assetUrl`, que solo antepone la base de la API
(`apps/web/lib/api.ts:213`): la web nunca ve el bucket.

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
(`apps/web/components/dialogs/material-dialog.tsx:195`), de modo que cada cambio de archivo cuesta
una llamada a la IA que el usuario percibe como espera antes de poder editar los campos.
