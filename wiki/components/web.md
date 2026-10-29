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
  - apps/web/components/layout/app-shell.tsx
  - apps/web/components/layout/site-footer.tsx
  - apps/web/components/ui/icon.tsx
  - apps/web/lib/icons.ts
synced: 4b7f1f3
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

`HomePage` (`apps/web/app/page.tsx:21`) mantiene `activeView` y conmuta entre `HomeView`,
`SubjectsView`, `MaterialsView`, `QuizView` y `EvaluationsView` (`apps/web/app/page.tsx:65`). Los diálogos — crear
materia, editar, borrar, agregar material, onboarding de usuario — viven en el mismo nivel que las
vistas y se abren por estado (`apps/web/app/page.tsx:104`), no por ruta.

La consecuencia práctica: **la URL no dice dónde estás**. Recargar la página vuelve siempre a
Inicio, y un quiz en curso o un borrador de material se pierden, porque su estado vive solo en el
componente. Es también lo que hace que la app funcione como app móvil: nada que enrutar.

## Dialogos que una vista abre desde dentro

La misma vista que lista materiales también puede crear uno, y para eso la página le pasa el
`openMaterialDialog` del hook (`apps/web/app/page.tsx:90`). Abrirlo desde Materiales lleva la
materia y el tema que ya están filtrados, así que `useMaterials.open` acepta opciones de
preselección en vez de no admitir argumentos
(`apps/web/hooks/use-materials.ts:19`) y el diálogo las aplica al cargar los temas
(`apps/web/components/dialogs/material-dialog.tsx:90`). El botón global de «Agregar material»
—en la barra lateral y en el menú móvil— sigue funcionando igual: la preselección solo se aplica
cuando viene. Hasta `6d3cfec` ese botón global era el FAB que sobresalía de la barra inferior.

El alta vive en un diálogo de la página, no en la vista, y la vista no se entera del resultado. Se
resuelve con un contador, hoy propiedad de `useMaterials`: la página lo incrementa al crear
(`apps/web/app/page.tsx:143`) y el propio hook lo vuelve a incrementar cuando termina cada proceso
(`apps/web/hooks/use-materials.ts:56`). `MaterialsView` lo usa como dependencia del efecto que lista
(`apps/web/components/views/materials-view.tsx:101`). Es un patrón de recarga por señal, no un
gestor de caché: la web no tiene invalidación de datos más allá de eso.

Que el contador viva en el hook y no en la página es consecuencia del procesamiento en segundo plano:
si el estado estuviera arriba del componente que lo dispara, recargar la vista perdería la señal del
material que sigue procesándose.

## Estado: hooks cortos, composición en la página

Tres hooks reúnen los datos y sus estados de carga y error: `useUser`, `useSubjects` y
`useMaterials`. Cada uno expone funciones ya cerradas que las vistas disparan; la página es quien
los compone (por ejemplo, crear una materia preselecciona esa materia en el diálogo de material,
`apps/web/app/page.tsx:39`). No hay store global ni React Query: si dos vistas necesitan lo mismo,
la página se lo pasa por props.

Desde `4fe2f8a` `useMaterials` dejó de ser solo el dueño del diálogo: también lo es del **procesamiento
en vuelo y de la señal de recarga**, que antes eran estado suelto de la página. Lo que motivó el
cambio es que el procesamiento no termina cuando el popup se cierra, así que su estado tiene que
vivir por encima de la vista que lo dispara. `startProcessing` envuelve el `processMaterial` y traga
el error a propósito (`apps/web/hooks/use-materials.ts:46`): el fallo habitual ya viene como material
`FAILED` y lo enseña la propia lista, y swallowar aquí evita un rechazo sin manejar en un `void`.

La navegación (`apps/web/lib/navigation.ts:1`) anuncia ya siete destinos; dos de ellos —
Progreso e Insignias (`apps/web/lib/navigation.ts:7-8`) — caen en un placeholder
(`apps/web/app/page.tsx:100`) porque aún no hay nada que mostrar. Evaluaciones tiene vista propia
(`apps/web/app/page.tsx:97`); `ba4dd59` la ubicó delante de Quiz en la navegación.

Los iconos de navegación son identificadores semánticos del mapa compartido `apps/web/lib/icons.ts:1`,
renderizados por `Icon` (`apps/web/components/ui/icon.tsx:13`). El layout raíz carga la fuente UIcons
(`apps/web/app/layout.tsx:4`) y `AppShell` coloca el footer de atribución al pie
(`apps/web/components/layout/app-shell.tsx:42`).

## El cliente HTTP

`lib/api.ts` es el único punto que habla con la API. Un `request` común resuelve la base desde
`NEXT_PUBLIC_API_URL` (`apps/web/lib/api.ts:83`), pasa `FormData` tal cual para las subidas
(`apps/web/lib/api.ts:97`) y convierte cualquier error HTTP en un `Error` con el mensaje que
devolvió Nest — `message` puede ser string o array y se normaliza a texto
(`apps/web/lib/api.ts:85`). Ese mensaje es el que ve el usuario en rojo: la API escribe los
mensajes de error pensando en la pantalla.

Desde `9342e58` el `request` tolera respuestas sin cuerpo: un `DELETE` de Nest no devuelve JSON, y
un `response.json()` a secas rompía con el borrado de materiales
(`apps/web/lib/api.ts:110`). Cualquier método que conteste `204` o con cuerpo vacío resuelve
`undefined` en vez de lanzar.

Las imágenes de preguntas se resuelven con `assetUrl`, que solo antepone la base de la API
(`apps/web/lib/api.ts:413`): la web nunca ve el bucket.

## Editar un material y lo que tiene debajo

El alta de material ganó un selector de modo de generación: el diálogo ofrece "Basadas en el material"
(por defecto) o "Preguntas similares", y ese valor viaja en el `POST` de creación
(`apps/web/components/dialogs/material-dialog.tsx:277`). Es un control de dos opciones, no un campo de
texto libre, y solo decide cómo el backend generará las preguntas al procesar (ver
[Procesamiento de un material de estudio](../flows/procesamiento-de-material.md)). El análisis con IA
sigue disparándose al elegir el archivo, antes de que el usuario vea el selector.

El diálogo de edición dejó de ser un formulario de dos campos: desde `95b7a11` lleva el nombre de
la materia en el propio título (`apps/web/components/dialogs/material-edit-dialog.tsx:47`) y bajo
los campos de título y contenido hay dos pestañas —Preguntas e Imágenes— controladas con estado
local, sin router (`apps/web/components/dialogs/material-edit-dialog.tsx:42`). Ambas se cargan al
abrir, con una sola llamada al par de endpoints.

La pestaña de preguntas es la que hace útil el diálogo: lista cada una con sus opciones, marca la
correcta y permite editar enunciado, explicación y opciones, o eliminar con una confirmación que
avisa de que arrastra quizzes. Al borrar, el diálogo avisa a la vista con `onQuestionsChanged` y el
conteo de la fila se actualiza sin volver a listar (`apps/web/components/views/materials-view.tsx:342`).
La de imágenes es de solo consulta, y el binario sale de `assetUrl` contra la ruta de la figura.

Borrar el material entero tiene su propio diálogo
(`apps/web/components/dialogs/material-delete-dialog.tsx:7`), que sigue el patrón de
`DeleteSubjectDialog`: nombre de la materia, aviso de que no se puede deshacer, y un texto que sí
es honesto sobre lo que sobrevive —las preguntas del tema se quedan— aunque el borrado en cascada
de lo demás todavía no avisa de su tamaño (`docs/ToDo/borrado-en-cascada-con-confirmacion-y-limpieza.md`).

Es el reverso de que reprocesar sea destructivo: corregir a mano es la salida que hoy no destruye
el historial de intentos (ver [Módulo de quizzes](../components/quizzes.md)).

El diálogo avisa de que editar el contenido deja las preguntas viejas: es la Fase 1 de
`docs/ToDo/ciclo-vida-preguntas-material.md` (`3fe7ee4`), y siendo la única defensa que existe por
ahora conviene leerlo como lo que es: el usuario ya está avisado, pero nada impide todavía que se
regenere por encima de un quiz ya resuelto. Desde `e02b72e` el mismo aviso menciona además que
reprocesar devuelve el título a la IA
(`apps/web/components/dialogs/material-edit-dialog.tsx:194`), que es la contrapartida de que la IA
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

**Lo que enseñan las tarjetas de materia ya no se inventa en el cliente.** Antes `decorateSubject`
fijaba `progress: 0` y `materials: 0` y el contador de materiales se calculaba en el cliente con un
N+1 (`refreshSubjectMaterialCount`, `apps/web/hooks/use-materials.ts:12`) que solo se disparaba al
crear un material desde la vista de Materiales (`apps/web/app/page.tsx:89`), así que el número quedaba
viejo. Eso se resolvió en el backend: `PrismaSubjectRepository` calcula `materialsCount` (suma de
materiales de sus temas) y `progress` (promedio de `score` de intentos completados) en la misma
consulta, y `decorateSubject` (`apps/web/lib/subjects.ts:64`) solo resuelve color/ícono con fallback.
`useMaterials` ya no computa conteos: tras crear o editar, `useSubjects` hace `reload` y la tarjeta
muestra los datos reales. Cierra `docs/ToDo/tarjetas-materia-datos-reales.md`.

## Límites de la interfaz

El onboarding toma el primer usuario de la lista (`apps/web/hooks/use-user.ts:21`), sin sesión ni
perfil: la misma instalación compartida entre dos navegadores muestra el mismo usuario. Y el
diálogo de material dispara el análisis con IA en cuanto se elige un archivo
(`apps/web/components/dialogs/material-dialog.tsx:200`), de modo que cada cambio de archivo cuesta
una llamada a la IA que el usuario percibe como espera antes de poder editar los campos.
