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
