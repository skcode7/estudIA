# Requerimiento: mapear enums de Prisma explícitamente en los repositorios

## Contexto

En `apps/api/src/modules/materials/infrastructure/prisma-material.repository.ts` hay casts silenciosos entre el tipo de la capa application y el enum de Prisma:

- Línea 20: `type: input.type as MaterialType` — cast desde el `MaterialType` de application al enum de Prisma.
- Línea 24: `processingStatus: "PENDING" as MaterialProcessingStatus` — cast de un literal al enum de Prisma.

La capa application redefine estos tipos de forma manual en `apps/api/src/modules/materials/application/ports/material.repository.ts`:

- Línea 1: `export type MaterialType = "TEXT" | "FILE" | "LINK";`
- Línea 3: `export type MaterialProcessingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";`

El cast `as` oculta la posibilidad de que el enum de Prisma y el tipo de application diverjan (si Prisma añade un valor desconocido, se acepta en silencio; si application define un valor que Prisma no tiene, falla en runtime).

Referencia: recomendación 10 de la revisión de arquitectura (Oracle, 21/09). Ver `docs/history/2026-09-22-recomendaciones-arquitectura.md`.

## Objetivo

Reemplazar los casts silenciosos por un mapeo explícito (`toPrismaMaterialType`, `toPrismaMaterialProcessingStatus`) en el repositorio, de modo que un valor no reconocido se detecte en tiempo de desarrollo (o falle explícitamente) en lugar de propagarse como cast.

## Alcance propuesto

- Funciones de mapeo explícitas en `prisma-material.repository.ts` (o en un mapper dentro de `infrastructure/`).
- Revisar el mismo patrón en otros repositorios que traduzcan tipos application → Prisma (grep de `as Material` / casts a enums de Prisma en `*/infrastructure/prisma-*.repository.ts`).
- Opcional: `satisfies` o una verificación exhaustiva para que TypeScript avise cuando los conjuntos de valores diverjan.

## Cambios implicados

### Backend
- `apps/api/src/modules/materials/infrastructure/prisma-material.repository.ts` — `toPrismaMaterialType(type)` y `toPrismaMaterialProcessingStatus(status)` en lugar de los casts.
- Otros repositorios que apliquen el mismo antipatrón (por confirmar con grep).
- Tests: no debería haber cambio de comportamiento; validar con typecheck + suite.

### Frontend
- Sin cambios.

## Fuera de alcance (por ahora)

- Generar los tipos de application desde el schema de Prisma (acoplaría la capa application a Prisma, lo contrario de la dirección de dependencias deseada).
- Migrar a un único enum compartido entre capas.

## Notas

- Coherencia con AGENTS.md: "Domain y application no dependen de frameworks ni proveedores externos"; mantener el tipo propio de application es correcto; solo falta explicitar el mapeo en el borde infrastructure.
- Es deuda de bajo riesgo hoy, pero el cast `as` es el tipo de silencio que esconde errores de mapeo.
