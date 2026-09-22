# Requerimiento: migrar DTOs de la API a Zod (validación compartida front/back)

## Contexto

Hoy AGENTS.md declara "class-validator (DTOs de la API) + Zod (salida de IA)". En el código:

- Los DTOs de NestJS usan `class-validator` + `class-transformer` con un `ValidationPipe` global en `apps/api/src/main.ts` (`transform`, `whitelist`, `forbidNonWhitelisted`).
- Los 5 archivos de DTOs actuales:
  - `apps/api/src/modules/materials/presentation/dto/materials.dto.ts`
  - `apps/api/src/modules/quizzes/presentation/dto/quizzes.dto.ts`
  - `apps/api/src/modules/subjects/presentation/dto/subjects.dto.ts`
  - `apps/api/src/modules/topics/presentation/dto/topics.dto.ts`
  - `apps/api/src/modules/users/presentation/dto/users.dto.ts`
- Zod solo se usa en `apps/api/src/infrastructure/ai/deepseek/deepseek.schemas.ts` para validar la salida del modelo de IA.

Decisión tomada el 2026-09-22 (recomendación 7 de la revisión de arquitectura): mantener class-validator en los DTOs para el MVP (funciona, cero fricción con NestJS) y documentarlo; migrar a Zod solo cuando exista una necesidad real de compartir reglas de validación entre `apps/web` y `apps/api`. Ver `docs/history/2026-09-22-recomendaciones-arquitectura.md`.

## Objetivo

Que, cuando aparezca reutilización real de reglas de validación entre el frontend (Next.js) y el backend (NestJS), los DTOs de la API migren a Zod para tener una única fuente de verdad (schema = tipo + validación) compartible entre ambas apps.

## Alcance propuesto

- Migrar los DTOs de `presentation/dto/*.ts` a schemas Zod (`z.object` + `z.infer`).
- Integrar la validación Zod en NestJS: un pipe propio o `nest-zod`, reemplazando `ValidationPipe` en `main.ts`.
- Compartir los schemas entre `apps/web` y `apps/api` (p. ej. un `packages/shared` del monorepo o import directo de schemas).
- Actualizar AGENTS.md para reflejar "Validación: Zod" a secas una vez migrado.

## Cambios implicados

### Backend
- `apps/api/src/main.ts` — reemplazar `ValidationPipe` por el pipe Zod.
- DTOs de materials/quizzes/subjects/topics/users — convertir a schemas Zod.
- Controllers — tipar parámetros con `z.infer` en lugar de las clases DTO.
- Tests — ajustar specs que dependen de class-validator/DTOs.

### Frontend
- Formularios (`apps/web`) que hoy validan manualmente podrían reutilizar los schemas compartidos.

## Fuera de alcance (por ahora)

- Migrar la validación de salida de IA: ya está en Zod (`deepseek.schemas.ts`).
- Usar `class-transformer` para otros fines (serialización/transformación) no relacionados con validación.

## Notas

- Coherencia con AGENTS.md: hoy la decisión documentada es class-validator (DTOs) + Zod (IA); este requerimiento revierte a Zod completo solo cuando haya beneficio real, para no sobreingenierizar el MVP.
- No implementar hasta que exista una necesidad concreta de compartir schemas front/back.
- Relacionado: recomendación 7 de la revisión de arquitectura (Oracle, 21/09).
