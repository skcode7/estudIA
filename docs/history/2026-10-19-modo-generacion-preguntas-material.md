# Sesión: Modo de generación de preguntas por material

**Fecha:** 2026-10-19
**Estado:** Completado

## Contexto

Hasta ahora las preguntas se generaban siempre sobre el contenido del material. Eso funciona para
materias de contenido (C. Naturales, E. Sociales) pero falla para materias como Inglés o Matemáticas,
donde el material es una **guía de ejercicios**: si la guía muestra `456 + 735 = 1191`, el modelo
generaba "¿cuánto es 456 + 735?" en vez de otra suma con la misma mecánica. El usuario quería elegir,
al cargar un material, cómo se generan sus preguntas. El requerimiento vivía en
`docs/ToDo/modo-generacion-preguntas.md`.

El modo es una propiedad del material (no de la materia): dos materiales de una misma materia pueden
tener modos distintos. El default reproduce el comportamiento anterior, de modo que la migración es
neutra para los materiales existentes.

## Cambios realizados

### Backend

- **Esquema y migración:** enum `MaterialQuestionMode` (`BASED_ON_MATERIAL | SIMILAR_QUESTIONS`) y
  campo `questionMode` en `Material` con default `BASED_ON_MATERIAL`
  (`apps/api/prisma/schema.prisma`); migración `20261018120000_add_material_question_mode`.
- **Frontera de datos:** tipo `MaterialQuestionMode` y `DEFAULT_MATERIAL_QUESTION_MODE` en
  `material.repository.ts`; mapeo en `prisma-material.repository.ts`.
- **DTOs y creación:** `MaterialQuestionModeDto` y `questionMode` opcional (`@IsEnum`) en
  `CreateTextMaterialDto` / `UploadMaterialDto`, expuesto en `MaterialDto`; el controller lo propaga
  y lo mapea en `toMaterialDto`; `CreateFileMaterialUseCase` persiste el modo.
- **Puerto de IA:** `GenerateQuestionsInput` gana `questionMode`, `subjectName` y `topicName`
  (`ai-provider.ts`).
- **Núcleo de prompts:** `deepseek.prompts.ts` refactoriza el system prompt en bloque común +
  `generateQuestionsSystemPrompt(mode)` (función pura); `SIMILAR_QUESTIONS` sustituye la regla "solo en
  el material" por la de guía de ejercicios (permite conocimiento general de la materia para crear
  datos nuevos); `generateQuestionsMessages` agrega `Materia:`/`Tema:` al contexto del usuario.
- **Procesamiento:** `ProcessMaterialUseCase` inyecta `TopicRepository` y `SubjectRepository`,
  resuelve materia/tema y pasa modo y nombres a `generateQuestions`.

### Frontend

- `apps/web/lib/api.ts`: tipo `MaterialQuestionMode`, `ApiMaterial.questionMode`, envío en
  `createMaterial`/`uploadMaterial`.
- `apps/web/components/dialogs/material-dialog.tsx`: control segmentado "Basadas en el material" /
  "Preguntas similares" ubicado **después** del campo "Texto o apuntes", con default la primera.

### Documentación

- **ToDo:** retirado `docs/ToDo/modo-generacion-preguntas.md` (totalmente implementado).
- **Wiki:** reconciliadas 13 páginas y re-apuntadas sus citas a las líneas actuales; nueva sección
  "Cómo generar las preguntas (questionMode)" en `components/materiales.md`, el flujo de
  procesamiento documenta que ahora busca materia/tema y pasa modo y nombres a `generateQuestions`,
  `components/ia.md` ganó "Prompts paramétricos por modo de generación", y `components/web.md`
  documenta el selector del diálogo. Checkpoint avanzado a `0326a48`.

## Validaciones

- `pnpm --filter @estudia/api typecheck` ✓ y `pnpm --filter @estudia/web typecheck` ✓.
- `eslint` ✓ en ambos paquetes.
- `vitest` ✓ — 77 tests en `materials` + `ai` (incluido un nuevo spec de prompts y el de modo/nombres
  en `process-material`).
- `wikipoke check` ✓ — sin errores ni drift; backlog de 2 archivos no cubiertos
  (`apps/api/src/shared/text.utils.ts`, `scripts/verify-deploy.sh`).
- **Pendiente en la máquina del usuario:** `pnpm verify:deploy` no se pudo ejecutar aquí (Docker no
  invocable en este WSL); la migración está escrita a mano y debe validarse al construir la imagen de
  producción.

## Commits

| Hash | Descripción |
|------|-------------|
| `83cadb8` | feat(api): añade enum MaterialQuestionMode al modelo y repositorio |
| `8b51148` | feat(api): expone questionMode en DTOs y creación de materiales |
| `ea4f392` | feat(api): generación de preguntas paramétrica por modo y nombres de materia/tema |
| `0326a48` | feat(web): selector de modo de generación en el diálogo de material |
| `2292659` | chore: retira ToDo de modo de generación de preguntas ya implementado |
| `52f7a92` | wiki: reconcilia con el modo de generación de preguntas por material |

## Pendientes / próximos pasos

- Ejecutar `pnpm verify:deploy` en un entorno con Docker para validar la migración en la imagen de
  producción.
- `docs/ToDo/ciclo-vida-preguntas-material.md`: decidir si se regeneran las preguntas al cambiar el
  modo de un material ya procesado (hoy el modo aplica al próximo procesamiento y lo ya generado no se
  toca).
- Relacionados abiertos: cantidad de preguntas por material
  (`docs/ToDo/preguntas-segun-longitud-material.md`) y modos adicionales de generación.
