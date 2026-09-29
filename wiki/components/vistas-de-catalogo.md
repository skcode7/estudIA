---
title: Vistas de catálogo (Inicio y Mis materias)
type: entity
responsibility: Dueño de las dos pantallas que muestran y gestionan materias —el tablero de Inicio y el listado de Mis materias— y del hook que mantiene el estado de Subjects, incluidos sus tres diálogos de alta, edición y borrado.
sources:
  - apps/web/components/views/home-view.tsx
  - apps/web/components/views/subjects-view.tsx
  - apps/web/components/views/placeholder-view.tsx
  - apps/web/components/ui/subject-card.tsx
  - apps/web/components/dialogs/subject-dialog.tsx
  - apps/web/components/dialogs/delete-subject-dialog.tsx
  - apps/web/components/dialogs/user-onboarding-dialog.tsx
  - apps/web/hooks/use-subjects.ts
synced: 9c5e777
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

`SubjectCard` (`apps/web/components/ui/subject-card.tsx:3`) se usa en las dos vistas y cambia de
forma según se le pasen o no los manejadores: sin ellos es una tarjeta de lectura, con ellos
aparecen los botones de editar y borrar y crece para llenar la celda
(`apps/web/components/ui/subject-card.tsx:12`). La distinción se llama `isSubjectsView` y controla
tres cosas a la vez —las acciones, el alto de la celda del icono y si la barra se empuja al fondo
con `mt-auto`— para que la rejilla de Mis materias alinee las barras entre tarjetas de distinta
descripción.

**La tarjeta muestra datos que no existen.** El conteo de materiales y la barra de progreso salen
de `decorateSubject` (`apps/web/lib/subjects.ts:19`), que fija `progress: 0` y `materials: 0`. El
conteo de materiales sí se actualiza en caliente, porque `useSubjects` expone
`setSubjectMaterials` y el diálogo de material lo llama tras crear; el progreso no tiene fuente y
no se actualiza nunca. La barra es decorativa en las dos vistas.

## El hook que sostiene todo

`useSubjects` (`apps/web/hooks/use-subjects.ts:13`) es el estado más grande de la web: 28 estados y
callbacks para tres operaciones. Carga las materias una vez al montar
(`apps/web/hooks/use-subjects.ts:33`) y de ahí saca un array ya decorado.

Tres detalles que no se ven leyendo las firmas:

- **El filtro es del cliente y es case-insensitive**: `filteredSubjects` compara contra nombre y
  descripción en minúsculas (`apps/web/hooks/use-subjects.ts:56`). No hay paginación ni búsqueda
  server-side; la lista entera baja siempre.
- **Decorar es parte del alta y de la edición.** `addSubject` decora con `subjects.length` y
  `saveSubject` re-decora usando el índice en la lista
  (`apps/web/hooks/use-subjects.ts:129`), porque el color y el ícono se eligen por posición. Es
  decir: **el orden de la lista decide el color de cada materia**, y editar una cambia el color de
  las siguientes. Un requerimiento abierto (`docs/ToDo/color-icono-materias.md`) elimina esa
  dependencia.
- **Cada operación escribe su propio aviso** en el estado `notice` de la página a través del
  `setNotice` recibido, así que el mismo banner sirve para alta, edición y borrado y se
  solapa con el que la vista muestra.

## Los diálogos

Los tres son casi gemelos, y esa repetición es el patrón del proyecto: **`mode` en lugar de dos
componentes**, un solo `SubjectDialog` para crear y editar
(`apps/web/components/dialogs/subject-dialog.tsx:11`), que solo cambia el título y el texto del
botón. La página lo monta con una `key` distinta por modo para que React remonte el formulario y
los campos no conserven el texto anterior.

`DeleteSubjectDialog` (`apps/web/components/dialogs/delete-subject-dialog.tsx:7`) confirma y no
recibe la materia como `Subject` sino lo que necesita para nombrarla. Avisa de que no se puede
deshacer, pero no de lo que arrastra el borrado en cascada — están los temas, los materiales y los
quizzes; está documentado en `docs/ToDo/confirmar-borrado-en-cascada.md`.

`UserOnboardingDialog` (`apps/web/components/dialogs/user-onboarding-dialog.tsx:7`) es la excepción
al patrón: no usa `Dialog` sino un overlay propio, porque no se cierra —no hay `×` ni cancelar— y
aparece incluso mientras carga la lista. La página lo muestra cuando `isUserLoading` **o** el
diálogo está abierto (`apps/web/app/page.tsx:49`), de modo que bloquea la app entera mientras
resuelve quién es el usuario. Solo pide un nombre, y ese nombre es el único perfil que existe en
el MVP (ver [Sin identidad en el MVP](../decisions/authentico.md)).

## Inicio y el placeholder

`HomeView` (`apps/web/components/views/home-view.tsx:7`) es la pantalla que más inventa: la tríada
de racha, XP y diamantes, el «Reto de hoy» y el «Nivel 8» de la barra lateral son valores fijos sin
origen en la API. Solo la rejilla de materias y los dos avisos de error son reales. Es la
consecuencia de que el progreso exista en el backend pero todavía no se exponga
(`docs/ToDo/exponer-progreso-basico.md`).

`PlaceholderView` (`apps/web/components/views/placeholder-view.tsx:1`) es lo que se renderiza para
Repaso, Progreso e Insignias: un recuadro con el nombre de la sección. La página decide entre
`HomeView`, `SubjectsView`, `MaterialsView`, `QuizView` y este último con un ternario, así que
añadir una pantalla real es añadir un caso, no una ruta.
