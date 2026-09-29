# Requerimiento: roles tutor y alumno

## Contexto

El MVP no tiene autenticación y el «usuario» es solo un nombre: `User` es `{id, name}` (`apps/api/prisma/schema.prisma:197`) y la web toma `users[0]` sin sesión (`apps/web/hooks/use-user.ts:24`). AGENTS.md prohíbe construir auth propia y difiere Authentico, así que el modelo actual es correcto **para el MVP**; el problema es que nada impide lo que vendrán a ser dos perfiles distintos.

Concretamente, hoy **cualquier cliente de la API puede**:

| Acción | Endpoint | Por qué importa |
|---|---|---|
| Leer la solución de todas las preguntas de un material | `GET /materials/:id/questions` | `toMaterialQuestionDto` devuelve `isCorrect` de cada opción y el `explanation` (`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:225-235`) |
| Editar o borrar preguntas | `PATCH` / `DELETE /materials/:id/questions/:questionId` (`:140-168`) | Editar incluye cambiar cuál opción es correcta |
| Reprocesar un material | `POST /materials/:id/process` (`:185-190`) | Es destructivo: `replaceForMaterial` borra las preguntas y en cascada quizzes e intentos (`docs/ToDo/ciclo-vida-preguntas-material.md`) |
| Borrar materiales | `DELETE /materials/:id` (`:202-205`) | Se lleva las figuras del storage |

La fuga de `isCorrect` es la más silenciosa: un alumno podría abrir el material en las herramientas del navegador y leer la clave de respuestas antes de responder el quiz. **La frontera correcta ya existe como práctica en otro sitio** — `toQuizDto` omite `isCorrect` a propósito (`apps/api/src/modules/quizzes/presentation/controllers/quizzes.controller.ts:54-60`) — pero solo está aplicada en el módulo de quizzes, no en el de materiales.

Un alumno no debería ver respuestas **antes** de intentarlo; después de enviar, el feedback (`QuizAnswerFeedbackDto` con `correctOptionId` y `explanation`) es legítimo y se queda.

## Objetivo

Que al integrar Authentico existan al menos dos roles con capacidades distintas: **tutor**, que cura el contenido (preguntas, materiales, procesamiento), y **alumno**, que estudia (consigue quizzes, responde y revisa sus resultados). La diferencia se aplica en la API, no escondiendo botones en la web.

## Alcance propuesto

- Rol como parte de la `Identity` que devuelve el `IdentityProvider`, **no** como columna nueva en `User`: dos fuentes de verdad para lo mismo se desincronizan en cuanto Authentico asigne el rol.
- Guard de autorización en la API (decorator + guard de NestJS) aplicado a las rutas de curación, no a los use cases: la regla de permisos no es lógica de negocio y no debe duplicarse por cada caso de uso.
- Clasificación explícita de las capacidades de la tabla de arriba, para que quede escrito qué puede hacer cada rol y no dependa de la memoria.
- El listado de preguntas de un material pasa a tutor-only; el alumno conserva la revisión posterior a un intento.
- La web deja de renderizar acciones de tutor cuando el rol no las permite, pero **eso es solo higiene visual**: la garantía está en el `403` de la API.

## Cambios implicados

### Backend
- `modules/identity/`: extender `Identity` con el rol. Depende de materializar el port que pide `docs/ToDo/frontera-identity-provider.md` (hoy la frontera es solo documental, no hay archivo en código).
- Guard de autorización + decorator de metadatos; aplicarlo en `materials.controller.ts` (edición/borrado de preguntas, process, delete) y en las rutas de escritura de materias, temas y materiales.
- `toMaterialQuestionDto` (`materials.controller.ts:225-235`): dejar de exponer `isCorrect` y `explanation` a roles sin permiso de curación, o mover la ruta entera a tutor-only.
- Tests del guard (rol con permiso, rol sin permiso, sin identidad) y del caso de uso que ya protege la pertenencia de la pregunta a su material (`update-material-question.use-case.ts:37`).

### Frontend
- `lib/api.ts`: propagar el rol que llega en la identidad.
- `components/ui/subject-card.tsx`, `components/dialogs/material-edit-dialog.tsx`, `components/views/materials-view.tsx`: ocultar las acciones de tutor según el rol.
- Un contexto de identidad/rol para no repetir la comprobación en cada componente.

## Fuera de alcance (por ahora)

- Cualquier cosa de autenticación en sí: tokens, sesiones, login, refresh. Sigue siendo territorio de Authentico.
- Permisos granulares por recurso o por materia (más de dos roles, herencia de permisos, permisos por materia).
- Modelo organizativo de alumnos por tutor (asignar materias, ver el progreso de otro).
- Facturación, planes, límites por rol.

## Notas

- Coherente con AGENTS.md: no se crea auth propia; lo único que se añade es la *frontera* que el propio AGENTS.md exige preparar, y que ya está especificada en `docs/ToDo/frontera-identity-provider.md`.
- **El reprocesar debe ser de tutor por una razón que no es de permisos sino de datos**: borra preguntas usadas y arrastra quizzes e intentos en cascada. Permitírselo a un alumno no es solo una acción indebida, es pérdida de historial.
- La omisión de `isCorrect` en `toQuizDto` es el patrón a replicar. La incoherencia entre ese DTO y `toMaterialQuestionDto` es la fuga concreta; la lista de acciones de la tabla es el resto.
- La web es SPA de una sola página y sin rutas por vista (`wiki/components/web.md`): el rol llega en la identidad, no se deduce de la URL.
- Relacionado: `docs/ToDo/frontera-identity-provider.md` (prerrequisito), `docs/ToDo/ciclo-vida-preguntas-material.md` (define por qué reprocesar es destructivo), `docs/ToDo/listado-quizzes-con-resultado.md` (el popup de detalle también es revisión post-intento, no una fuga).
