# Requerimiento: confirmar el borrado de una materia con lo que arrastra

## Contexto

Borrar una materia borra en cascada temas, materiales, preguntas, quizzes e intentos (`apps/api/prisma/schema.prisma`). `DeleteSubjectUseCase` solo comprueba que la materia exista y borra la fila.

El diálogo de la web (`apps/web/components/dialogs/delete-subject-dialog.tsx`) pregunta si se quiere eliminar el nombre y dice que no se puede deshacer. No menciona materiales, temas ni quizzes, y no consulta ningún conteo. El wiki (`wiki/components/catalogo.md`) señala que no hay confirmación de lo que arrastra.

Además, `name` de materia (y de tema) no tiene índice único: dos materias con el mismo nombre conviven, y el diálogo las distingue solo por el texto visible.

## Objetivo

Que el usuario vea, antes de confirmar, cuántos temas, materiales y quizzes se perderán, y que el borrado no sea un clic ciego sobre una cascada irreversible.

## Alcance propuesto

- Endpoint o inclusión en `GET /subjects/:id` de conteos: temas, materiales, preguntas, quizzes.
- Diálogo de borrado con esos números y un texto explícito de que se pierden materiales y progreso.
- Opcional: exigir escribir el nombre de la materia para confirmar cuando hay materiales.

## Cambios implicados

### Backend
- `GetSubjectUseCase` / DTO de detalle con conteos, o un `GET /subjects/:id/deletion-preview`.
- Tests con materia vacía vs materia con hijos.

### Frontend
- `delete-subject-dialog.tsx`: listar lo que se va a borrar.
- Cliente API para el preview o el detalle enriquecido.

## Fuera de alcance (por ahora)

- Limpiar el bucket (`docs/ToDo/limpiar-storage-al-borrar-cascada.md`).
- Unicidad de nombres (se puede registrar aparte si molesta en el uso real).
- Papelera / borrado lógico.

## Notas

- Hallazgo del wiki: `wiki/components/catalogo.md`. El diálogo real es aún más escueto que lo que el wiki resume: no avisa de materiales.
- Coherencia con AGENTS.md: mobile-first y amigable; una cascada sin números no lo es.
