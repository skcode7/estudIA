# Sesión: Implementación de las recomendaciones de la revisión de arquitectura

**Fecha:** 2026-09-22
**Estado:** Completado

## Contexto

La revisión de arquitectura ejecutada por el agente Oracle (sesión del 21/09) identificó 10 hallazgos y un top 5 de recomendaciones. Esta sesión cerró todas las recomendaciones, ya sea implementándolas (1, 2, 3, 8), documentándolas (5, 7) o registrándolas como requerimiento pendiente en `docs/ToDo` (4, 9, 10). También se cerró la deuda de commits y documentación que había quedado a medias por un reinicio del equipo.

## Cambios realizados

### Backend

**Recomendación 1 — `MaterialsController` accedía directamente a `MaterialQuestionRepository`** (violación de Clean Architecture):
- `apps/api/src/modules/materials/application/ports/material-question.repository.ts` — nuevo tipo `MaterialWithQuestionCount` (`{ material, questionCount }`).
- `get-material.use-case.ts`, `list-materials.use-case.ts`, `update-material.use-case.ts` — inyectan el repo de preguntas y devuelven `MaterialWithQuestionCount` (con sus specs actualizados).
- `materials.controller.ts` — ya no inyecta el repositorio; delega el conteo en los casos de uso.

**Recomendación 2 — `ObjectStorage` vivía en `infrastructure`** (application dependía de infrastructure):
- `apps/api/src/modules/storage/application/ports/object-storage.ts` — port nuevo en application (clase abstracta + `UploadInput`/`StoredObject`), replicando el patrón de `modules/ai/application/ports/ai-provider.ts`.
- `apps/api/src/modules/storage/object-storage.module.ts` — módulo `@Global()` movido a `modules/storage`.
- `infrastructure/object-storage/s3.object-storage.ts` — importa el port desde application; eliminados los archivos viejos `object-storage.ts` y `object-storage.module.ts`.
- `create-file-material.use-case.ts`, `delete-material.use-case.ts`, `process-material.use-case.ts` — importan el port desde application (con specs).

**Recomendación 3 — use cases leían `process.env` directamente**:
- `apps/api/src/shared/env.utils.ts` — helper `parsePositiveInt(value, fallback)`.
- `process-material.use-case.ts` — recibe `{ questionsCount }` vía `@Inject(PROCESS_MATERIAL_CONFIG)`.
- `generate-quiz.use-case.ts` — recibe `{ questionsCount }` vía `@Inject(GENERATE_QUIZ_CONFIG)`.
- `materials.module.ts` y `quizzes.module.ts` — proveedores `useFactory` que resuelven `AI_QUESTIONS_PER_MATERIAL` / `QUIZ_QUESTIONS_COUNT` (default 3). Los specs ya no manipulan `process.env`.

**Recomendación 8 — duplicación de `shuffle`/`pickRandom`**:
- `apps/api/src/shared/random.utils.ts` — helper `shuffle<T>` único (Fisher-Yates).
- `generate-quiz.use-case.ts` — eliminado `pickRandom`; usa `shuffle(...).slice(0, count)`.
- `quizzes.controller.ts` — eliminada la función `shuffle` local; usa el helper compartido.

### Frontend
- Sin cambios.

### Documentación
- `AGENTS.md` — convenciones de `docs/history` y `docs/ToDo`; línea de Stack actualizada a "class-validator (DTOs de la API) + Zod (salida de IA)".
- `architecture/ARCHITECTURE.md` — §6 Storage: port en application, implementación S3 en infrastructure, método `getObject` añadido.
- `requirements/ADR-0001-MVP-SIMPLICITY.md` — refleja MinIO como storage S3-compatible local (recomendación 5).
- `.gitignore` — excluye `.omo/`.
- `docs/history/2026-09-17-fix-deploy-coolify-config-s3-deepseek.md` — resumen de sesión previo pendiente de commitear.
- `docs/ToDo/` — nuevos requerimientos: `migracion-zod-dtos.md` (rec 7), `desacoplar-modulos-repositorios.md` (rec 9), `mapeo-explicito-enums-prisma.md` (rec 10), `frontera-identity-provider.md` (rec 4).

## Validaciones

- `tsc --noEmit` (typecheck API): exit 0.
- `vitest run` (API): 68 tests pasados en 21 archivos.
- `eslint "src/**/*.ts"` (lint API): exit 0.

Durante la validación se corrigió además un error de tipos en `get-material.use-case.spec.ts` (anotar el mock como `MaterialRecord`) y un import sin uso en `list-materials.use-case.ts`.

## Commits

| Hash | Descripción |
|------|-------------|
| `65fc89d` | fix(materials): mover conteo de preguntas del controller a los use cases |
| `b6c9926` | docs(architecture): reflejar MinIO como storage S3-compatible local en ADR-0001 y ARCHITECTURE |
| `ff31ea9` | docs(agents): documentar convenciones de docs/history y docs/ToDo |
| `ddd653f` | chore(git): excluir carpeta .omo/ del agente |
| `3e70579` | docs(history): agregar resumen de sesión fix deploy Coolify |
| `99070e5` | refactor(storage): mover ObjectStorage a un port en application |
| `4d15a50` | docs(history): agregar resumen de sesión recomendaciones de arquitectura |
| `855ae80` | refactor(config): inyectar configuración en use cases en lugar de process.env |
| `18030f2` | docs: documentar decisión de validación y requerimiento de migración a Zod |
| `88bb1dd` | refactor(quizzes): deduplicar shuffle en un helper compartido |
| `be8bbe8` | docs(ToDo): registrar recomendaciones 4, 9 y 10 de la revisión de arquitectura |

## Pendientes / próximos pasos

Recomendaciones registradas como `docs/ToDo` (no implementadas en esta sesión):

- **Recomendación 4** — materializar la frontera `IdentityProvider`; se implementará junto con la integración de Authentico (`docs/ToDo/frontera-identity-provider.md`).
- **Recomendación 9** — desacoplar módulos NestJS (importar puertos, no `Prisma*Repository` concretos): `docs/ToDo/desacoplar-modulos-repositorios.md`.
- **Recomendación 10** — reemplazar casts `as MaterialType`/`as MaterialProcessingStatus` por mapeo explícito: `docs/ToDo/mapeo-explicito-enums-prisma.md`.
- **Recomendación 7** — migrar DTOs a Zod cuando haya reutilización real de schemas front/back: `docs/ToDo/migracion-zod-dtos.md`.
