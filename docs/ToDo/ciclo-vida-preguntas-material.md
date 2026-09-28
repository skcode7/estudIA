# Requerimiento: ciclo de vida de las preguntas de un material

## Contexto

Un material tiene dos cosas que se generan juntas: el **contenido** y las **preguntas**. Las preguntas nacen al procesar, leyendo el contenido de ese momento, y desde entonces nadie sabe si siguen correspondiéndose con él: el modelo `Material` no tiene ningún campo que diga cuándo se procesó (`apps/api/prisma/schema.prisma`), así que editar el contenido no deja rastro y la UI sigue anunciando las mismas preguntas de siempre.

Cuando algo sí toca esas preguntas, la base de datos reacciona sola y en silencio. `QuizQuestion` y `Answer` referencian a `Question` con `onDelete: Cascade` (`apps/api/prisma/schema.prisma`), de modo que hoy **cualquiera** de estas operaciones destruye historial sin preguntar:

| Operación | Efecto actual |
|---|---|
| Reprocesar el material (`replaceForMaterial`) | borra las preguntas y, en cascada, quizzes e intentos |
| Editar una pregunta a mano | solo borra sus opciones; es la única segura |
| Borrar una pregunta a mano | la misma cascada que reprocesar |
| Borrar el material | las preguntas sobreviven con `sourceMaterialId` en `null` |

Consecuencias, documentadas en `wiki/components/quizzes.md`: un quiz generado antes pierde preguntas en silencio y queda con menos de las que nació; los intentos corregidos pierden su detallado aunque conserven el `score`; y `TopicProgress` no se recalcula, así que sus contadores suman aciertos que ya no tienen respuesta detrás.

Este requerimiento unifica tres que estaban separados y que en realidad son la misma pregunta —*qué puede hacerse con preguntas que ya están en un quiz*— y la resuelve en tres fases, de menos a más invasiva.

Unifica: `marcar-material-desactualizado.md`, `reprocesar-material-preserva-historial.md` y `preguntas-huerfanas-al-borrar-material.md`.

## Objetivo

Una regla única y honesta: **una pregunta que ya está en un quiz es inmutable**. No se edita, no se borra y no se regenera. Y una pregunta que no se quiere seguir usando tiene una salida —**Excluir**— que la aparta de los nuevos quizzes sin tocar la historia.

## Fase 1 · Aviso de material desactualizado (MVP)

Sin tocar el backend. En el diálogo de edición, cuando el material esté `COMPLETED` y tenga preguntas, un aviso explica que editar el texto no actualiza las preguntas y que hay que reprocesar o corregirlas a mano. La Fase 2 y la 3 dan sentido a ese aviso; hoy es la única defensa posible.

La web ya tiene todo lo necesario para saberlo: `processingStatus` y `questionCount` llegan en cada material.

## Fase 2 · Regenerar solo lo que nadie ha usado

`ProcessMaterialUseCase` comprueba, antes de `replaceForMaterial`, si alguna de las preguntas del material aparece en `QuizQuestion`. Si ninguna aparece, reprocesa como hoy. Si alguna aparece, **no regenera** y responde con un `409` explicando por qué.

Es la regla que pedía el usuario: regenérer solo si ninguna pregunta se ha usado. Cubre el caso común —corregir un apunte antes de estudiarlo— sin tocar nada que ya tenga historial.

## Fase 3 · Preguntas usadas inmutables, y Excluir

1. **Bloquear edición y borrado** de una pregunta que esté en algún `QuizQuestion`, con el mismo `409` explicativo. Hoy el diálogo de edición permite ambas cosas y rompe el historial en silencio.
2. **Excluir**: acción que aparta el material (o una pregunta suelta) de la selección de quizzes futuros. A diferencia del borrado, **funciona aunque la pregunta esté usada**: conserva quizzes, intentos y progreso, y solo deja de ofrecerla.

La exclusión se implementa con una marca en `Question` (`excludedAt` o `isExcluded`) y un filtro en el único punto por el que entran preguntas a un quiz: `findQuestionIdsByTopics` (`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:18`). Ese filtro es la diferencia entre "excluida para el futuro" y "borrada", y por eso puede ser reversible.

## Decisiones abiertas

- **Excluir en bloque o pregunta a pregunta.** El caso de uso real es «este material ya no lo estudio»: un botón que excluye todas las preguntas del material. La pregunta suelta es el granularity fino. Proponer ambos, el de bloque primero.
- **Reactivar.** Si excluir es reversible, hace falta un camino de vuelta; si no, Excluir es casi un borrado disfrazado y pierde su ventaja.
- **Qué hacer con un material excluido en la UI.** Queda `COMPLETED` con sus preguntas, pero fuera del pool. Hay que decidir si se marca en el listado para que no parezca disponible.

## Cambios implicados

### Backend
- `apps/api/src/modules/materials/application/ports/material-question.repository.ts` — método para contar/listar preguntas del material que aparecen en `QuizQuestion`.
- `apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts` — comprobación previa a `replaceForMaterial`, con `ConflictException` si hay uso.
- `apps/api/src/modules/materials/application/use-cases/update-material-question.use-case.ts` y `delete-material-question.use-case.ts` — rechazar la operación si la pregunta está usada.
- Nuevo caso de uso de exclusión (excluir/reincluir preguntas de un material) y su endpoint.
- `apps/api/prisma/schema.prisma` — marca de exclusión en `Question` + migración.
- `apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:18` — filtro de exclusión en la selección de preguntas.
- `apps/api/src/modules/materials/application/use-cases/delete-material.use-case.ts` — aplicar la política de borrado con la regla nueva (hoy `sourceMaterialId` es `SetNull` y no avisa).
- Tests: regenerar sin uso, `409` con uso, editar/borrar con uso, exclusión fuera y dentro del pool, borrado de material con preguntas usadas.

### Frontend
- Diálogo de edición: aviso de la Fase 1; deshabilitar Editar/Eliminar con la razón a la vista; acción Excluir.
- Listado de materiales: marca visible de desfasado o excluido, cuando se implemente la Fase 2.
- `apps/web/lib/api.ts` — cliente de las nuevas rutas.

## Fuera de alcance (por ahora)

- Snapshot del enunciado en el quiz (la alternativa de fondo a toda esta política: si el quiz copiara la pregunta, nada de esto sería necesario). Es más caro y no se necesita si la regla de inmutabilidad basta.
- Corregir `TopicProgress` cuando algo se borra en cascada. Se acepta que el contador quede como está; está anotado en `docs/ToDo/exponer-progreso-basico.md`.
- Mover la decisión al usuario con un aviso previo en lugar de un `409`.
- `docs/ToDo/persistir-quiz-en-curso.md` sigue abierto: un `GET /quizzes/:id` sobre un quiz cuyas preguntas se borraron devolverá menos preguntas, y la Fase 3 evita que eso ocurra.

## Notas

- Coherencia con AGENTS.md: el procesamiento sigue siendo on-demand; esto no introduce colas ni workers. Es «manejar errores explícitamente» aplicado a la integridad del historial, y evitar duplicación (tres ToDos que eran la misma pregunta ahora son uno).
- La Fase 1 no depende de las otras dos y puede hacerse ya; las Fases 2 y 3 comparten la misma comprobación de uso, así que conviene implementarlas juntas aunque la 1 se adelante.
- No confundir con `docs/ToDo/generacion-inteligente-quiz.md` (cómo se eligen las preguntas del quiz) ni con `docs/ToDo/preguntas-segun-longitud-material.md` (cuántas se generan): esas cambian la calidad, esto cambia la integridad.
- Hallazgos del wiki: `wiki/components/materiales.md` y `wiki/components/quizzes.md`.
