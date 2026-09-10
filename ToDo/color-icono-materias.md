# Requerimiento: selección de color e ícono por materia

## Contexto

Actualmente `apps/web/app/page.tsx` asigna el color e ícono de cada materia de forma cíclica según su índice en la lista (`decorateSubject`):

```ts
const color = colorOptions[index % colorOptions.length];
```

Los 4 patrones fijos están en `colorOptions`:
- √ / emerald
- ⚗ / blue
- ⌂ / orange
- ▤ / violet

Estos campos son solo presentación (no existen en la BD: `apps/api/prisma/schema.prisma`, modelo `Subject` solo tiene `id`, `name`, `description`, `createdAt`, `updatedAt`).

## Objetivo

El usuario debe poder elegir el color y el ícono de cada materia al crearla (o al editarla), y esa elección debe persistirse.

## Alcance propuesto

- Permitir seleccionar color e ícono en el modal "Nueva materia" (`app/page.tsx`).
- Persistir la elección en el backend.
- Definir un set de colores e íconos fijo y validado (evitar valores arbitrarios del cliente).

## Cambios implicados

### Backend
- Modelo `Subject` en Prisma: añadir campos para el estilo, p. ej.:
  - `palette` (`String` con valores tipo `"emerald" | "blue" | "orange" | "violet"`) o
  - `icon` + `color` explícitos.
  - Migración Prisma correspondiente.
- Extender `CreateSubjectDto` (`apps/api/src/modules/subjects/presentation/dto/subjects.dto.ts`) y `SubjectDto` con el/los campo(s) de estilo.
- Extender el puerto `SubjectRepository` y su implementación Prisma para guardar y devolver el estilo.
- Validar que el valor esté dentro del set permitido (enums en Prisma y validación en el DTO).

### Frontend
- Modal "Nueva materia": selector de color e ícono (grid de opciones de las 4 paletas existentes).
- `apps/web/lib/api.ts`: incluir el campo de estilo en `CreateSubjectInput` y `ApiSubject`.
- `decorateSubject` (`app/page.tsx`): usar el estilo persistido si existe; mantener un fallback cíclico para materias creadas antes del cambio.

## Fuera de alcance (por ahora)
- Editar color/ícono de materias existentes (requiere endpoint `PATCH /subjects/:id`).
- Colores/íconos personalizados más allá del set definido.

## Notas
- Coherencia con AGENTS.md: validar inputs, no sobreingenierizar, buenas decisiones de frontera sitúan estos campos como dominio de presentación; definir si entran en el modelo de dominio o se manejan como metadata.