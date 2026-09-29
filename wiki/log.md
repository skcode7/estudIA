# Registro del wiki

## 2026-09-24 · wikipoke-ingest

Siembra inicial del wiki (14 páginas) sobre el commit `36ec39f`.

- new: `architecture.md`, `flows/procesamiento-de-material.md`, `flows/figuras-embebidas.md`,
  `flows/generar-y-resolver-quiz.md`, `components/materiales.md`, `components/quizzes.md`,
  `components/ia.md`, `components/catalogo.md`, `components/web.md`,
  `concepts/puertos-y-adapters.md`, `concepts/configuracion-por-entorno.md`,
  `decisions/proveedor-ia.md`, `decisions/storage-s3-minio.md`, `decisions/authentico.md`
- `wiki/.wikipokeignore` adaptado al repo: tests (`**/*.spec.ts`, 24 archivos), migraciones de
  Prisma, `docs/schema.prisma` (copia generada), configs de build (`tsconfig*`, `eslint`,
  `next`, `postcss`, `nest-cli`, `turbo`, `Dockerfile`) y `apps/web/public/**`.
- No se trajo nada de vuelta con `!`: el producto del repo es código, y el Markdown de `docs/`,
  `architecture/` y `requirements/` se ignora para cobertura aunque se ha **leído** como
  evidencia para las páginas de decisiones (ADR-0001, ADR-0002, ADR-0003).
- `packages/config` es un placeholder vacío; `packages/types` y `packages/validation` existen pero
  no los importa nadie todavía (anotado en `components/web.md`).
- Hallazgos anotados en las páginas, sin tocar código: el borrado en cascada de preguntas al
  reprocesar un material arrastra respuestas históricas (`components/quizzes.md`); el borrado de
  una materia no limpia el bucket (`components/catalogo.md`); `TopicProgress` se escribe pero
  nadie lo lee; `AIProvider.explainAnswer` y `generateHint` están implementados sin uso;
  `ObjectStorage.getSignedUrl` igual.
- Pendiente: los flujos de onboarding de usuario y de borrado de materia con cascada, y una
  decisión sobre el "progreso básico" (qué exponer de `TopicProgress`).

## 2026-09-24 · wikipoke-ingest apps/api/src

Pase sobre el cluster `apps/api/src` (44 archivos sin cubrir al empezar).

- new: `components/persistencia.md` (PrismaService/PrismaModule y los repositorios: convenciones
  de orden, updates parciales, reemplazo en transacción y borrado real), y
  `components/crud-de-catalogo.md` (la forma del CRUD de materias/temas/usuarios: caso de uso por
  operación, validación en el DTO, bindings repetidos y asimetrías entre módulos).
- `components/ia.md`: nueva sección sobre schemas y mappers, con la tolerancia de los schemas Zod,
  la exigencia de una sola respuesta correcta, la normalización de coordenadas 0–1 / 0–100 y la
  foto viajando como data URL base64.
- `components/materiales.md`: nueva sección sobre lectura y edición; editar contenido no reprocesa
  y deja preguntas desactualizadas.
- `components/quizzes.md`: contrato de entrada del intento (`SubmitAttemptDto`).
- `decisions/storage-s3-minio.md`: el binding `@Global()` de `ObjectStorage`.
- `architecture.md`: sonda de salud (`GET /api/v1/health`, literal y sin tocar la base de datos) y
  tabla de páginas actualizada.
- Hallazgo anotado en `components/crud-de-catalogo.md`: `PATCH` vacío aceptado en materias/temas
  pero rechazado en materiales (asimetría de reglas entre controladores).
- Resultado: `apps/api/src` queda **totalmente cubierto** (0 archivos sin reclamar). El backlog
  pasa de 69 a 25 archivos: 17 en `apps/web/components`, 2 más en `apps/web` (`app`, `hooks`), 5 en
  `packages/*` (aún placeholders) y `pnpm-workspace.yaml`.

## 2026-09-28 · wikipoke-ingest

Reconciliación con 10 commits (desde `36ec39f`): unificación de los botones de material, CRUD de
preguntas e imágenes en la API, alta de material desde el listado y edición con pestañas.

- `components/materiales.md` — nueva sección «Corregir una pregunta a mano»: las cuatro rutas bajo
  el material, por qué el repositorio filtra por `sourceMaterialId` y qué reglas impone
  `UpdateMaterialQuestionUseCase` (2–6 opciones, exactamente una correcta, imagen del material).
  Anotado que borrar una pregunta arrastra `QuizQuestion` y `Answer`.
- `components/web.md` — el diálogo de edición como segunda pantalla del módulo (título con la
  materia, pestañas Preguntas/Imágenes, `onQuestionsChanged`); el diálogo de alta abierto desde la
  vista con preselección de materia/tema; recarga por contador (`materialsReloadSignal`) porque no
  hay caché que invalidar; `request` tolerante a respuestas sin cuerpo desde `9342e58`.
- `components/quizzes.md` — la cascada de borrar una pregunta es la misma que reprocesar; editar
  el texto no la tiene, y por eso la web ofrece esa vía. Enlaza con el ToDo que sigue abierto.
- `flows/figuras-embebidas.md` — enlaza con la página de materiales, donde vive el listado de
  figuras; el flujo no cambia.
- `architecture.md` — descripciones de materiales y web actualizadas en la tabla de páginas.
- Citas re-apuntadas y `synced:` elevating a `95361be` en las 9 páginas afectadas.
- El backlog baja de 25 a 24 archivos: la web sigue siendo lo no cubierto (16 en
  `apps/web/components`, más `app` y `hooks` a medias), más los placeholders de `packages/*` y
  `pnpm-workspace.yaml`. No se reclamó ningún archivo nuevo salvo los ya leídos para las páginas
  tocadas.

## 2026-09-28 · wikipoke-ingest apps/web/components

Cluster de 16 archivos de la interfaz, el último grande del backlog. Dos páginas nuevas, sin tocar
ninguna de las que ya existían más que para enlazarlas y reclamar dos archivos sueltos.

- new: `components/armazon-y-primitivas.md` — `AppShell` y las dos navegaciones (la misma lista
  `navItems`, entera en escritorio y recortada a cuatro en móvil); el diálogo base y su variante
  `wide`; los tres estados de lista; y el vocabulario de cuatro estilos de botón que se repite sin
  token de Tailwind.
- new: `components/vistas-de-catalogo.md` — Inicio y Mis materias, la tarjeta que las dos comparten y
  el estado de Subjects, con sus tres diálogos. Documentado que el color de una materia depende de
  su posición en la lista, y que editar una cambia el color de las siguientes.
- `components/web.md` y `architecture.md` — enlaces cruzados y `material-delete-dialog.tsx` /
  `globals.css` reclamados donde correspondía.
- Hallazgo anotado: `ErrorPanel` tiene el título fijo «No se pudieron cargar tus materias»
  (`components/ui/state-panels.tsx:16`) y lo reutilizan Materiales y Quiz, así que un fallo al
  cargar otra cosa miente al usuario. No se corrigió: un pase de wiki no toca código.
- Sin tocar código, sin claims busescos y sin ampliar `sources` más allá de lo leído.
- Resultado: el backlog pasa de 24 a **6 archivos**, todos los de `packages/*` y `pnpm-workspace.yaml`
  (este último ya reclamado desde `architecture.md`). Los cinco `packages/*` son placeholders vacíos:
  no merecen página mientras estén como están, y su futuro ya está decidido en
  `docs/ToDo/paquetes-compartidos-vacios.md`.

## 2026-09-28 · wikipoke-ingest

Reconciliación con 11 commits (desde `b291b79`): el material se procesa al confirmar el popup, la IA
deduce el título y el aviso de edición lo dice. Tres páginas reescritas, dos solo re-apuntadas.

- `flows/procesamiento-de-material.md` — la separación guardar/procesar que daba por entendido la
  apertura ya no es lo que hace la web: confirmar encadena el proceso y el popup cierra mientras
  corre en segundo plano (`4fe2f8a`). Nueva sección sobre el título: el diálogo lo precarga con el
  nombre del archivo, así que una sugerencia vacía lo dejaba guardar como `IMG-20240315-WA0037.jpg`,
  y la causa era la regla del prompt que lo declaraba opcional y la puerta de salida que el modelo
  tomaba 1 de cada 4 veces. Documentado con las dos mediciones (antes 1/4, después 0/8) y el aviso
  que lo compensa (`e02b72e`). Corregido además que el título se sobrescribe sin condiciones, frente
  al contenido que solo cambia si difiere.
- `components/web.md` — `useMaterials` deja de ser solo el dueño del diálogo y pasa a serlo también
  del procesamiento en vuelo y de la señal de recarga, con el porqué: el proceso ya no muere con el
  popup, así que su estado no puede vivir en el componente que lo dispara. Documentado también el
  **contador de materiales de las tarjetas como bug y no como dato pendiente**: existe código que
  lo calcula y solo corre al crear un material desde la vista de Materiales, y es un N+1, así que el
  arreglo en el cliente sería un parche. Cita al ToDo que ya lo recogió.
- `components/ia.md` — nueva regla sobre los prompts como contrato: una regla floja se traduce en
  datos malos que el schema tolerante no detecta, porque no hay nada que validar. Es la versión
  general del caso del título.
- `architecture.md` y `components/vistas-de-catalogo.md` — solo re-apuntadas (`page.tsx` se corrió una
  línea al dejar de declarar el contador de recarga en la página).
- `synced:` elevado a `6931a91` en las 4 páginas tocadas; checkpoint del repo advancements al mismo
  commit. Cero páginas nuevas, cero archivos nuevos reclamados más allá de los leídos.
- Queda pendiente y **no se escribió**: los cinco requerimientos de `docs/ToDo/` que el usuario
  encajó en la misma sesión (roles tutor/alumno, nivel de quiz, contador de tarjetas, historial de
  quizzes, promedio de progreso) no tienen página. Son comportamiento futuro, no código, y las páginas
  describen lo que el código hace.
