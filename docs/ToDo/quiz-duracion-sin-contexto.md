# Requerimiento: explicar qué significa la duración del quiz

## Contexto

En la vista de Quiz, el selector "Duración" ofrece solo tres etiquetas: `Corta`, `Media` y `Larga` (`apps/web/components/views/quiz-view.tsx:254-265`). No hay ninguna pista de cuántas preguntas implica cada opción.

En el backend, la duración es un porcentaje del pool de preguntas del alcance elegido (materia o tema):

- `SHORT`: 30 %
- `MEDIUM`: 50 %
- `LONG`: 70 %

`countForSize` redondea y garantiza al menos 1 pregunta (`apps/api/src/modules/quizzes/application/use-cases/generate-quiz.use-case.ts:18-31`). El usuario no ve nada de esto: con 8 preguntas disponibles, "Corta" puede ser 2 y "Larga" 6; con 20, la diferencia es mucho mayor. El historial sí muestra el conteo final ("8 preguntas", "11 preguntas"), lo que evidencia que ese dato existe una vez generado.

Además, el panel vacío dice "Crea un quiz de aws con tus preguntas" (`quiz-view.tsx:277-283`) sin anticipar cuántas se generarán, y no hay una opción "todas las preguntas".

## Objetivo

Que el estudiante pueda anticipar el tamaño del quiz antes de generarlo, y que la etiqueta de duración no sea ambigua.

## Alcance propuesto

### Frontend

- Añadir un texto de ayuda bajo el selector (asociado con `aria-describedby`): "Corta ≈ 30 % de las preguntas del tema; Media ≈ 50 %; Larga ≈ 70 % (mínimo 1)".
- Si la vista puede conocer el pool (ver abajo), mostrar el conteo estimado en cada opción: "Corta · ~3 preguntas", "Media · ~5", "Larga · ~7", usando la misma fórmula (`Math.round(pool * ratio)`, mínimo 1) para que coincida con el backend.
- Reflejar el resultado también en el panel vacío una vez conocido: "Se generarán ~5 preguntas de aws".
- Mantener el valor por defecto actual (`MEDIUM`) y no cambiar el contrato `SHORT | MEDIUM | LONG`.

### Backend (solo si se elige mostrar conteos exactos)

- Exponer el tamaño del pool por materia/tema (p. ej. en el DTO de materia o un endpoint liviano de "preguntas disponibles"), sin devolver las preguntas ni las respuestas correctas.
- Alternativa sin backend: mantener el texto con porcentajes y mínimos, que ya elimina la ambigüedad principal.

## Fuera de alcance (por ahora)

- Dificultad adaptativa o selección inteligente de preguntas (`docs/ToDo/generacion-inteligente-quiz.md`).
- Duración por tiempo (cronómetro).
- Cambiar los ratios del backend.
- Opción "todas las preguntas" (evaluar después; hoy `LONG` cubre el 70 %).

## Notas

- Evidencia: el selector solo expone las tres etiquetas y el backend aplica 30/50/70 % con redondeo y mínimo 1. No se generó un quiz durante la auditoría para no crear datos en la base de desarrollo.
- Relacionado con `docs/ToDo/persistir-quiz-en-curso.md` (implementado: `GET /quizzes/:id` ya permite reanudar quizzes largos). El botón "Generar quiz" en el header y el paginado del historial (10 por página) ya están implementados en `quiz-view.tsx` y `quiz-history-panel.tsx`.
- Coherente con AGENTS.md: cambio pequeño, sin lógica de negocio en el cliente más allá de mostrar una estimación.
