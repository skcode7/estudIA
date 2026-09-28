# Requerimiento: decidir el destino de las preguntas al borrar un material

## Contexto

Al borrar un material, `sourceMaterialId` es `onDelete: SetNull` (`apps/api/prisma/schema.prisma`, modelo `Question`): las preguntas siguen en el pool de quizzes sin material de origen. Las imágenes caen en cascada con el material y `Question.imageId` queda en `null`.

El resultado (`wiki/components/materiales.md`): borrar un material no borra su contenido generado. Un quiz puede mostrar "¿qué es esta imagen?" sin imagen, o una pregunta cuyo enunciado ya no se puede contrastar con el apunte.

No hay nada en la API ni en la web que avise de este efecto.

## Objetivo

Que borrar un material tenga una regla explícita y visible: o las preguntas (y sus quizzes) se van con el material, o se conservan de forma coherente (sin preguntas de imagen huérfanas).

## Alcance propuesto

- Elegir una de estas políticas y aplicarla de punta a punta:
  1. **Cascada de preguntas**: borrar el material borra sus preguntas (y lo que cuelga: `QuizQuestion`, `Answer`), con el mismo problema de historial que el reproceso; o
  2. **Conservar preguntas de texto** y descartar o inactivar las que tenían `imageId`; o
  3. **Impedir el borrado** mientras existan quizzes que usan esas preguntas.
- Reflejar la política en el diálogo de borrar material.
- Alinear tests con la política elegida.

## Cambios implicados

### Backend
- `schema.prisma` (`onDelete` de `sourceMaterialId` / preguntas).
- `DeleteMaterialUseCase`: aplicar la política (hoy solo borra fila + storage).
- Tests de borrado con preguntas de texto y de imagen, y con quiz existente.

### Frontend
- Diálogo de borrar material: texto según la política (qué se pierde).

## Fuera de alcance (por ahora)

- Snapshot de quiz (`docs/ToDo/reprocesar-material-preserva-historial.md`) salvo que se elija la política 1 y se implementen juntos.
- Recolector de preguntas huérfanas históricas.

## Notas

- Hallazgo del wiki: `wiki/components/materiales.md`.
- Coherencia con AGENTS.md: no dejar reglas de negocio solo en el esquema Prisma sin que el caso de uso (y el usuario) las conozcan.
- Relacionado: `docs/ToDo/reprocesar-material-preserva-historial.md` (otra cascada sobre las mismas FKs).
