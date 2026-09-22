# Sesión: Arreglos de arquitectura tras la revisión (recomendaciones 1 y 2)

**Fecha:** 2026-09-22
**Estado:** Completado

## Contexto

La revisión de arquitectura ejecutada por el agente Oracle (sesión del 21/09) identificó 10 hallazgos y un top 5 de recomendaciones. En esta sesión se implementaron las dos recomendaciones de severidad alta y varios ajustes de documentación derivados de la misma revisión, además de cerrar la deuda de commits pendientes que había quedado a medias por un reinicio del equipo.

## Cambios realizados

### Backend

**Recomendación 1 — `MaterialsController` accedía directamente a `MaterialQuestionRepository`** (violación de Clean Architecture):
- `apps/api/src/modules/materials/application/ports/material-question.repository.ts` — nuevo tipo `MaterialWithQuestionCount` (`{ material, questionCount }`).
- `apps/api/src/modules/materials/application/use-cases/get-material.use-case.ts` — inyecta el repo de preguntas y devuelve `MaterialWithQuestionCount`.
- `apps/api/src/modules/materials/application/use-cases/list-materials.use-case.ts` — ídem para la lista.
- `apps/api/src/modules/materials/application/use-cases/update-material.use-case.ts` — ídem para la actualización.
- `apps/api/src/modules/materials/presentation/controllers/materials.controller.ts` — ya no inyecta el repositorio; delega el conteo en los casos de uso.
- Specs de los tres use cases actualizados (`*.spec.ts`).

**Recomendación 2 — `ObjectStorage` vivía en `infrastructure` y los casos de uso lo importaban desde ahí** (application dependía de infrastructure):
- `apps/api/src/modules/storage/application/ports/object-storage.ts` — nuevo port en la capa application (clase abstracta `ObjectStorage` + `UploadInput`/`StoredObject`), replicando el patrón de `modules/ai/application/ports/ai-provider.ts`.
- `apps/api/src/modules/storage/object-storage.module.ts` — módulo `@Global()` movido a `modules/storage`; registra `S3ObjectStorage` para el port.
- `apps/api/src/infrastructure/object-storage/s3.object-storage.ts` — ahora importa el port desde application.
- `apps/api/src/infrastructure/object-storage/object-storage.ts` y `object-storage.module.ts` — eliminados (movidos).
- `apps/api/src/modules/materials/application/use-cases/{create-file-material,delete-material,process-material}.use-case.ts` — importan el port desde application.
- `apps/api/src/app.module.ts` — import actualizado al nuevo módulo.

### Frontend
- Sin cambios.

### Documentación
- `architecture/ARCHITECTURE.md` — sección Storage: port en `application`, implementación S3 en `infrastructure`; método `getObject` añadido a la interfaz.
- `requirements/ADR-0001-MVP-SIMPLICITY.md` — refleja MinIO como storage S3-compatible local (recomendación 6 de la revisión).
- `AGENTS.md` — convenciones de `docs/history` y `docs/ToDo`.
- `.gitignore` — excluye la carpeta `.omo/` del agente.
- `docs/history/2026-09-17-fix-deploy-coolify-config-s3-deepseek.md` — resumen de sesión previo pendiente de commitear.

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

## Pendientes / próximos pasos

Resto de recomendaciones de la revisión de arquitectura (Oracle, 21/09):

- **Recomendación 3** — inyectar configuración en los casos de uso en lugar de leer `process.env` (`process-material.use-case.ts`, `generate-quiz.use-case.ts`).
- **Recomendación 4** — materializar la frontera `IdentityProvider` para Authentico (hoy solo documentada en ADR-0003 y ARCHITECTURE.md §7).
- **Recomendación 5** — actualizar ADR-0001 respecto a MinIO (ya cubierto en esta sesión con `b6c9926`).
- **Recomendaciones 7-10** — validación de entrada con Zod vs class-validator, duplicación `shuffle`/`pickRandom`, acoplamiento inter-módulo de repositorios Prisma, cast `MaterialType` de Prisma hacia application (severidad baja).
