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

Al otro lado, el quiz se construye hoy **sin ninguna selección**: baraja todas las preguntas de los temas elegidos
(`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:18`). El estudiante no puede decir qué quiere estudiar; solo puede recibir lo que hay.

Este requerimiento unifica tres que estaban separados y que son la misma pregunta —*qué puede hacerse con preguntas que ya están en un quiz*— y añade la respuesta a la que hoy no existe salida: **dejar de usar un material sin borrarlo**.

Unifica: `marcar-material-desactualizado.md`, `reprocesar-material-preserva-historial.md` y `preguntas-huerfanas-al-borrar-material.md`.

## Objetivo

Dos reglas, y una de ellas es nueva:

1. **Una pregunta que ya está en un quiz es inmutable.** No se edita, no se borra y no se regenera.
2. **Un material puede estar marcado o no.** La marca es reversible y decide si sus preguntas entran en los quizzes nuevos. Es la respuesta a «ya no quiero estudiar esto», que hoy no existe: o se borra (y se lleva el historial por delante) o se sigue recibiendo en cada quiz.

## Fase 1 · Aviso de material desactualizado (MVP) — implementada

Sin tocar el backend. En el diálogo de edición, cuando el material esté `COMPLETED` y tenga preguntas, un aviso explica que editar el texto no actualiza las preguntas y que hay que reprocesar o corregirlas a mano. La Fase 2 y la 3 dan sentido a ese aviso; hasta entonces era la única defensa posible.

La web ya tenía todo lo necesario para saberlo: `processingStatus` y `questionCount` llegan en cada material. No hizo falta ningún campo nuevo ni endpoint.

Implementado en `3fe7ee4`. `WarningNote` (`apps/web/components/ui/feedback.tsx`) es la tercera primitiva de realimentación, y el motivo de que sea nueva es la lección del momento: `Notice` y `FieldError` existían y ninguno servía, porque el aviso no es un éxito ni un error. Reutilizar cualquiera de los dos habría puesto un mensaje de peligro donde solo hay una advertencia.

Siendo la Fase 1 la única defensa disponible, el texto del aviso nombra las dos salidas reales —reprocesar o corregir a mano en la pestaña Preguntas— en vez de limitarse a advertir. Un aviso que dice «esto no hace lo que crees» sin decir qué hacer solo traslada el problema.

## Fase 2 · Regenerar solo lo que nadie ha usado

`ProcessMaterialUseCase` comprueba, antes de `replaceForMaterial`, si alguna de las preguntas del material aparece en `QuizQuestion`. Si ninguna aparece, reprocesa como hoy. Si alguna aparece, **no regenera** y responde con un `409` explicando por qué.

Cubre el caso real —corregir un apunte antes de estudiarlo— sin tocar nada que ya tenga historial.

## Fase 3 · Preguntas usadas inmutables

Editar o borrar una pregunta que esté en algún `QuizQuestion` devuelve el mismo `409` explicativo. Hoy el diálogo de edición permite ambas cosas y rompe el historial en silencio.

Esa misma regla resuelve, sin decisión aparte, **el borrado del material**. Hoy `Question.sourceMaterialId` es `onDelete: SetNull`: al borrar un material, sus preguntas sobreviven sin material de origen y un quiz puede mostrar «¿qué es esta imagen?» sin imagen. Con la Fase 3 la política sale sola:

- Material con alguna pregunta usada en un quiz → el borrado se rechaza con el mismo `409`, porque borraría historial.
- Material sin preguntas usadas → el borrado se lleva también sus preguntas, y `SetNull` deja de tener ningún caso de uso.

Es la diferencia entre un borrado que deja restos y uno que es limpio: no hace falta elegir política, basta con aplicar la misma regla en un sitio más.

## Fase 4 · El flag de estudio en el material

Un booleano `marked` en `Material` que dice si el material está en la lista de estudio del estudiante. Es reversible por definición: excluir es ponerlo a `false`, y volver a incluir es ponerlo a `true`.

**El valor por defecto es `true` (marcado)**, para que la migración no cambie el comportamiento de nada de lo que ya está en la base y todo material nuevo entre solo en el pool. Se empieza a **desmarcar** lo que no se estudia, en vez de marcar lo que sí. El default contrario traería una trampa difícil de ver: un material recién subido y todavía sin procesar no tiene preguntas, así que no aparecería en ningún quiz, y no habría forma de saber que el sistema lo está ignorando salvo mirar el flag.

**El filtro va en un solo sitio**: `findQuestionIdsByTopics`, que es el único punto por el que entran preguntas a un quiz. Pasa a filtrar por material marcado, y con eso quedan resueltas de una vez las dos caras de la misma marca:

- **Excluir** un material desde el listado de materiales: deja de generar preguntas nuevas sin tocar quizzes, intentos ni progreso. Es la salida que hoy no existe, y por eso la regla de inmutabilidad deja de ser un castigo.
- **Marcar** una selección de materiales para estudiar: el pool del quiz se reduce a esa selección.

### Dos niveles que no deben confundirse

La marca es estado persistente y se cambia en el listado. La selección del quiz es efímera y no toca la marca:

```
Material.marked   →  persistente, se cambia en la lista de materiales
Selector de Quiz  →  efímero, solo ofrece temas con material marcado
```

Elegir un tema en la pantalla de Quiz **no marca ni desmarca nada**: solo delimita por dónde se baraja. Es lo que hace falta para que el selector sea un filtro de verdad, en lugar de un cambio de estado disfrazado cada vez que se abre un quiz.

### Las preguntas sin material quedan fuera, a propósito

El filtro por material marcado deja fuera, de paso, las preguntas que no tienen material. Hoy esas preguntas existen en el modelo: `Question.sourceMaterialId` es nullable, y solo se llenan por el procesamiento de un material. Con la Fase 3, ese hueco deja de ser un efecto secundario de borrar un material y pasa a ser un caso con nombre propio: **una pregunta escrita a mano, sin apunte detrás** — sacada de otra evaluación, un tema extra que se quiera estudiar.

Es un caso de uso real, pero no es de este requerimiento. La regla que se implementa ahora es explícita y mínima: **una pregunta sin material no entra en los quizzes**, aunque el modelo la permita. Cuando ese caso de uso se diseñe, habrá que revisar el filtro del pool a propósito, no descubrirlo como efecto secundario de un `join`.

Por eso el filtro debe escribirse como decisión —«solo preguntas con material marcado»— y no apoyarse en que la JOIN excluirá lo demás por accidente.

### Cómo se ve un material desmarcado

No hace falta un distintivo ni un badge nuevo: **el contador de preguntas se pone gris**. Hoy ese contador es verde esmeralda (`apps/web/components/views/materials-view.tsx:289`) y dice cuántas preguntas hay generadas; en un material desmarcado pasa al gris que ya usa el estado «Pendiente» (`apps/web/components/ui/material-status-badge.tsx:4`, `bg-slate-100 text-slate-600`). La fila sigue mostrando las preguntas que tiene, solo que en un tono que no reclama atención: el material está ahí, pero fuera de la lista de estudio.

La convención que hay detrás, y que conviene no romper al añadir estados nuevos:

> El **badge de estado** habla del procesamiento (¿se procesó? `PENDING`, `COMPLETED`…). El **color del contador** habla de la disponibilidad (¿entra en el pool?).

Un material desmarcado sigue mostrando su badge «Listo» en verde —procesado es procesado— y su contador en gris. Mezclar los dos sí sería confuso: un badge apagado sugeriría que hay que procesarlo otra vez.

## Decisiones abiertas

- **Mensaje de «no hay preguntas».** El error actual (`GenerateQuizUseCase`) dice «procesa materiales con IA». Con el flag pasa a tener dos causas distintas —no hay preguntas generadas, o no hay materiales marcados— y el mensaje debería distinguirlas.

### La acción de marcar vive en la fila

Se decide en la fila del listado de materiales, no en el diálogo de edición: armar una lista de estudio es comparar materiales entre sí, y eso solo se puede hacer viendo la lista completa. El diálogo sirve para corregir uno concreto, que no es el trabajo de este caso.

Eso lleva la fila a **cuatro acciones**, y aquí hay una asimetría que conviene respetar: Procesar, Editar y Eliminar son **acciones** —verbos que hacen algo— y Marcar es un **estado** que ya está o no está. No debería leerse igual. La forma que mantiene la diferencia es un botón conmutador (estrella, marcador, check) que refleja el estado actual y cambia al pulsarse, no un cuarto verbo con su etiqueta. Si se mezclan, la fila deja de leerse como «qué puedo hacer aquí» y pasa a ser un muro de botones.

## Cambios implicados

### Backend
- `apps/api/src/modules/materials/application/ports/material-question.repository.ts` — método para listar las preguntas del material que aparecen en `QuizQuestion`.
- `apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts` — comprobación previa a `replaceForMaterial`, con `ConflictException` si hay uso.
- `apps/api/src/modules/materials/application/use-cases/update-material-question.use-case.ts` y `delete-material-question.use-case.ts` — rechazar la operación si la pregunta está usada.
- `apps/api/prisma/schema.prisma` — flag en `Material` (`Boolean @default(true)`) + migración. La columna `sourceMaterialId` sigue nullable: la Fase 3 no la elimina, solo le quita el caso de uso que tenía (`SetNull`), y el modelo queda admitting preguntas sin material a propósito.
- Puerto y casos de uso de Material: exponer y cambiar la marca (`PATCH /materials/:id/study` o similar, o un campo más del `PATCH` existente).
- `apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:18` — filtro por material marcado, escrito como decisión explícita.
- Selector de temas de la pantalla de Quiz: hoy `listTopics` devuelve todos los temas de la materia sin saber nada de preguntas
  (`apps/web/components/views/quiz-view.tsx:35`). Hacen falta temas con material marcado (y con preguntas) — un conteo en el DTO de tema o un endpoint propio.
- `apps/api/src/modules/materials/application/use-cases/delete-material.use-case.ts` — la política de borrado derivada de la Fase 3: rechazar si hay preguntas usadas, y borrar sus preguntas en el resto de casos.
- Tests: regenerar sin uso, `409` con uso, editar/borrar con uso, borrado de material con y sin preguntas usadas, el filtro del pool con material marcado y desmarcado, y que las preguntas sin material queden fuera a propósito.

### Frontend
- Diálogo de edición: aviso de la Fase 1; Editar y Eliminar deshabilitados con la razón visible.
- Listado de materiales: botón conmutador de marcar/desmarcar en la fila, y el contador de preguntas en gris (`text-slate-500`) en vez de verde cuando el material está desmarcado.
- Vista de Quiz: el selector de temas pasa a ofrecer solo los elegibles, y el mensaje de «no hay preguntas» distingue las dos causas.
- `apps/web/lib/api.ts` — cliente de las nuevas rutas.

## Fuera de alcance (por ahora)

- Snapshot del enunciado en el quiz (la alternativa de fondo a toda esta política: si el quiz copiara la pregunta, nada de esto sería necesario). Es más caro y no se necesita si la regla de inmutabilidad basta.
- **Crear preguntas a mano, sin material de origen.** El modelo lo permite (`sourceMaterialId` es nullable) y es un caso de uso real —apuntes de otra evaluación, un tema extra—, pero no es de este requerimiento. Aquí solo se establece que esas preguntas no entran en los quizzes.
- Corregir `TopicProgress` cuando algo se borra en cascada. Se acepta que el contador quede como está; está anotado en `docs/ToDo/exponer-progreso-basico.md`.
- Mover el estado al usuario con un aviso previo en lugar de un `409`.
- `docs/ToDo/persistir-quiz-en-curso.md` sigue abierto: un `GET /quizzes/:id` sobre un quiz cuyas preguntas se borraron devolverá menos preguntas, y la Fase 3 evita que eso ocurra.

## Notas

- Coherencia con AGENTS.md: el procesamiento sigue siendo on-demand; esto no introduce colas ni workers. Es «manejar errores explícitamente» aplicado a la integridad del historial, y evitar duplicación (tres ToDos que eran la misma pregunta ahora son uno).
- La Fase 1 no depende de las demás y puede hacerse ya. Las Fases 2 y 3 comparten la misma comprobación de uso; la Fase 4 es independiente de ellas y se puede hacer en cualquier momento.
- La Fase 4 habilita `docs/ToDo/generacion-inteligente-quiz.md`: si el pool ya está acotado a una selección, seleccionar por desempeño tiene mucho menos sentido de resolver en un mar de preguntas.
- No confundir con `docs/ToDo/preguntas-segun-longitud-material.md` (cuántas se generan): esas cambian la calidad, esto cambia la integridad y la disponibilidad.
- Hallazgos del wiki: `wiki/components/materiales.md` y `wiki/components/quizzes.md`.
