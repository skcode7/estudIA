# Requerimiento: desacoplar módulos NestJS (importar puertos, no implementaciones Prisma)

## Contexto

Varios módulos NestJS importan la implementación concreta de un repositorio de OTRO módulo en lugar de consumir su puerto, lo que rompe la encapsulación inter-módulo a través de la capa `infrastructure`:

1. `apps/api/src/modules/materials/materials.module.ts:4` — importa `PrismaTopicRepository` desde `../topics/infrastructure/prisma-topic.repository` (lo provee en la línea 31 como `TopicRepository`).
2. `apps/api/src/modules/quizzes/quizzes.module.ts:4,6` — importa `PrismaSubjectRepository` (desde `../subjects/infrastructure/`) y `PrismaTopicRepository` (desde `../topics/infrastructure/`) para proveerlos en las líneas 19-20.
3. `apps/api/src/modules/topics/topics.module.ts:4` — importa `PrismaSubjectRepository` desde `../subjects/infrastructure/prisma-subject.repository` (lo provee en la línea 23 como `SubjectRepository`).

Referencia: recomendación 9 de la revisión de arquitectura (Oracle, 21/09). Ver `docs/history/2026-09-22-recomendaciones-arquitectura.md`.

## Objetivo

Que cada módulo exporte su puerto (`SubjectRepository`, `TopicRepository`, etc.) y que los módulos consumidores importen el MÓDULO (que exporta el provider), no la clase concreta `Prisma*Repository`. Así, cambiar la implementación de un repositorio no obliga a tocar los módulos que lo consumen.

## Alcance propuesto

- `SubjectsModule` exporta `SubjectRepository`; `TopicsModule` exporta `TopicRepository`.
- `TopicsModule` importa `SubjectsModule` (y usa `SubjectRepository` exportado) en lugar de importar `PrismaSubjectRepository`.
- `MaterialsModule` y `QuizzesModule` importan `TopicsModule` / `SubjectsModule` y usan los puertos exportados.
- Revisar si hay otros acoplamientos similares entre módulos (grep de `../*/infrastructure/` en los `*.module.ts`).

## Cambios implicados

### Backend
- `apps/api/src/modules/subjects/subjects.module.ts` — añadir `exports: [SubjectRepository]`.
- `apps/api/src/modules/topics/topics.module.ts` — importar `SubjectsModule`, quitar el import de `PrismaSubjectRepository`, añadir `exports: [TopicRepository]`.
- `apps/api/src/modules/materials/materials.module.ts` — importar `TopicsModule`, quitar el import de `PrismaTopicRepository`.
- `apps/api/src/modules/quizzes/quizzes.module.ts` — importar `SubjectsModule` y `TopicsModule`, quitar los imports de `PrismaSubjectRepository`/`PrismaTopicRepository`.
- Tests: no debería haber cambio funcional; validar con typecheck + suite.

### Frontend
- Sin cambios.

## Fuera de alcance (por ahora)

- Inversión de control global / abstracción de módulos más allá del patrón estándar de NestJS (`imports` + `exports`).
- Extraer los repositorios a una librería compartida.

## Notas

- Coherencia con AGENTS.md: Clean Architecture, "no acceder a Prisma desde domain/application", "evitar duplicación".
- Es el patrón estándar de NestJS: consumir el módulo que exporta el provider, no la clase concreta.
- No es un bug funcional (todo funciona hoy); es deuda de acoplamiento.
