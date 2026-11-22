---
title: Vistas de catálogo (Inicio y Mis materias)
type: entity
responsibility: Dueño de las dos pantallas que muestran y gestionan materias —el tablero de Inicio y el listado de Mis materias— y del hook que mantiene el estado de Subjects, incluidos sus tres diálogos de alta, edición y borrado.
sources:
  - apps/web/components/views/home-view.tsx
  - apps/web/components/views/subjects-view.tsx
  - apps/web/components/views/placeholder-view.tsx
  - apps/web/components/ui/subject-card.tsx
  - apps/web/components/ui/subject-carousel.tsx
  - apps/web/components/dialogs/subject-dialog.tsx
  - apps/web/components/dialogs/delete-subject-dialog.tsx
  - apps/web/components/dialogs/user-onboarding-dialog.tsx
  - apps/web/components/dialogs/login-dialog.tsx
  - apps/web/hooks/use-subjects.ts
  - apps/web/lib/icons.ts
synced: ee6e904
related:
  - ./web.md
  - ./armazon-y-primitivas.md
  - ./catalogo.md
---

# Vistas de catálogo (Inicio y Mis materias)

Dos pantallas para lo mismo —las materias— con propósitos distintos: Inicio las muestra como
punto de entrada, Mis materias las administra. El estado que las alimenta es un solo hook, y los
tres diálogos de materia viven en la página, no aquí.

## Una tarjeta, dos contextos

`SubjectCard` (`apps/web/components/ui/subject-card.tsx:4`) se usa en las dos vistas y cambia de
forma según se le pasen o no los manejadores: sin ellos es una tarjeta de lectura, con ellos
aparecen los botones de editar y borrar (`apps/web/components/ui/subject-card.tsx:13`). Desde
`35f2d1b` **las dos variantes son `flex h-full flex-col`** (`apps/web/components/ui/subject-card.tsx:21`)
**y empujan la barra al fondo con `mt-auto`**
(`apps/web/components/ui/subject-card.tsx:60`): el carrusel necesita que la tarjeta
llene la altura del carril, y la rejilla de Mis materias sigue alineando las barras entre tarjetas
de distinta descripción. `isSubjectsView` ya solo decide las acciones y el hover.

**La tarjeta muestra datos reales.** El conteo de materiales y la barra de progreso ya no se inventan:
vienen de la API. `decorateSubject` (`apps/web/lib/subjects.ts:64`) resuelve el color y el ícono de
la materia (con fallback a los valores por defecto si no trae alguno) y deja `materialsCount` y
`progress` tal cual llegan del backend; el contador de materiales se actualiza en caliente porque
`useSubjects` expone `reload` y el diálogo de material lo invoca tras crear. La barra refleja el
progreso real de los quizzes de la materia.

## El carrusel de Inicio

Desde `35f2d1b` Inicio no dibuja una rejilla que crece hacia abajo: monta `SubjectCarousel`
(`apps/web/components/ui/subject-carousel.tsx:19`), un carril horizontal con paginación lateral.
El ancho de cada tarjeta es una fracción exacta del carril (1 en móvil, 1/2 en `sm`, 1/3 en `lg`,
1/4 en `xl`, `apps/web/components/ui/subject-carousel.tsx:87`), así que cada página ocupa justo lo
visible; un `ResizeObserver` mide cuántas caben y recalcula el número de páginas
(`apps/web/components/ui/subject-carousel.tsx:56`). Los botones Anterior/Siguiente saltan de un
bloque al siguiente con `scrollTo` (`apps/web/components/ui/subject-carousel.tsx:65`) y el propio
scroll del carril actualiza el número de página. Si la última página queda a medias, se rellena
con huecos invisibles para que el salto no se desalinee
(`apps/web/components/ui/subject-carousel.tsx:98`). En móvil se ve una sola tarjeta por página.

## El hook que sostiene todo

`useSubjects` (`apps/web/hooks/use-subjects.ts:15`) es el estado más grande de la web: 28 estados y
callbacks para tres operaciones. Carga las materias una vez al montar
(`apps/web/hooks/use-subjects.ts:36`) y de ahí saca un array ya decorado.

Tres detalles que no se ven leyendo las firmas:

- **El filtro es del cliente y es case-insensitive**: `filteredSubjects` compara contra nombre y
  descripción en minúsculas (`apps/web/hooks/use-subjects.ts:60`). No hay paginación ni búsqueda
  server-side; la lista entera baja siempre.
- **Color e ícono vienen de la materia, no de la posición.** `addSubject` y `saveSubject` ya no
  calculan la paleta por índice: el `SubjectDialog` envía `color` e `icon` elegidos por el usuario
  (`apps/web/components/dialogs/subject-dialog.tsx:33`) y el backend los valida contra `SUBJECT_COLORS`
  / `SUBJECT_ICONS`. `decorateSubject` (`apps/web/lib/subjects.ts:64`) solo aplica un fallback si la
  materia no trae alguno. El mapa `apps/web/lib/icons.ts` sigue siendo la fuente de glifos; `a859db8`
  estabilizó esa representación. La unificación de color/ícono, contador de materiales y progreso real
  de las tarjetas quedó resuelta y el ToDo correspondiente fue retirado.
- **Cada operación escribe su propio aviso** en el estado `notice` de la página a través del
  `setNotice` recibido, así que el mismo banner sirve para alta, edición y borrado y se
  solapa con el que la vista muestra.

## Los diálogos

Los tres son casi gemelos, y esa repetición es el patrón del proyecto: **`mode` en lugar de dos
componentes**, un solo `SubjectDialog` para crear y editar
(`apps/web/components/dialogs/subject-dialog.tsx:33`), que solo cambia el título y el texto del
botón. La página lo monta con una `key` distinta por modo para que React remonte el formulario y
los campos no conserven el texto anterior.

`DeleteSubjectDialog` (`apps/web/components/dialogs/delete-subject-dialog.tsx:7`) confirma y no
recibe la materia como `Subject` sino lo que necesita para nombrarla. Avisa de que no se puede
deshacer, pero no de lo que arrastra el borrado en cascada — están los temas, los materiales y los
quizzes; está documentado en `docs/ToDo/borrado-en-cascada-con-confirmacion-y-limpieza.md`.

El onboarding por nombre **ya no se monta**. Con el login de Authentico (`c627736`) la página
muestra `LoginDialog` cuando no hay sesión (`apps/web/app/page.tsx:51`), que pide login y contraseña
y no se cierra; si la API no responde, el mismo diálogo cambia a «Sin conexión» con un botón de
reintento (`apps/web/components/dialogs/login-dialog.tsx:36`). `UserOnboardingDialog`
(`apps/web/components/dialogs/user-onboarding-dialog.tsx:8`) sigue en el repositorio con su overlay
propio y esa misma pantalla de error, pero nada lo importa ya: es código muerto. El `User` local lo
resuelve `useUser` por login (ver [Autenticación](../components/auth.md)).

## Inicio y el placeholder

`HomeView` (`apps/web/components/views/home-view.tsx:9`) conserva el «Reto de hoy» como texto fijo
—título, subtítulo y bullets—, pero desde `5525cd7` ya no pinta la tríada de racha, XP y diamantes:
solo la rejilla de materias y los avisos vienen de la API. La marca (`/brand/estudia-logo.webp`) se
usa como marca de agua al 20 % en el hero, con `next/image`, y el resto de la pantalla sigue el
vocabulario de iconos UIcons del mapa común, no emojis.

En desktop el grid tiene dos columnas (`xl:grid-cols-[minmax(0,1fr)_320px]`) y dos filas: el hero
y «¡No olvides!» comparten la primera (`xl:row-start-1` en
`apps/web/components/views/home-view.tsx:38` y
`apps/web/components/views/home-view.tsx:109`), y el carrusel de «Mis materias» comparte
la segunda con el panel «Efemérides» (`apps/web/components/views/home-view.tsx:125`). `35f2d1b`
había puesto el hero a ancho completo y bajado el recordatorio junto a la grilla; `ee6e904` volvió
a la disposición anterior y añadió «Efemérides» como **placeholder genérico** —texto fijo, sin
llamadas a la API de Wikimedia— para reservar el hueco derecho de esa fila. En móvil todo se
apila: hero, materias, recordatorio y efemérides.

`PlaceholderView` (`apps/web/components/views/placeholder-view.tsx:3`) es lo que se renderiza para
Progreso e Insignias: un recuadro con el nombre de la sección. La página decide entre
`HomeView`, `SubjectsView`, `MaterialsView`, `QuizView`, `EvaluationsView` y este último con un ternario, así que
añadir una pantalla real es añadir un caso, no una ruta.
