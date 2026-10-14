# Requerimiento: modo de generación de preguntas por material

## Contexto

Las preguntas se generan al procesar el material, no al generar el quiz: `ProcessMaterialUseCase`
(`apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts`) llama a
`aiProvider.generateQuestions(...)` y persiste el resultado con `questionRepository.replaceForMaterial(...)`.
El prompt vive en `apps/api/src/infrastructure/ai/deepseek/deepseek.prompts.ts`, donde
`GENERATE_QUESTIONS_SYSTEM_PROMPT` (línea 65) incluye la regla:

```
- Basa las preguntas solo en el material proporcionado, nunca en conocimiento externo.
```

y `generateQuestionsMessages` (línea 140) solo le pasa al modelo el título, el análisis
(resumen/conceptos/objetivos), el contenido completo y las imágenes del material.

Eso funciona bien para materias como E. Sociales o C. Naturales, donde las preguntas válidas salen
del contenido cargado. Pero falla para materias como Inglés o Matemáticas, donde el material es una
**guía de ejercicios**, no fuente de contenido a preguntar: si la guía muestra `456 + 735 = 1191`,
el modelo genera "¿cuánto es 456 + 735?", cuando lo válido sería otra suma de tres dígitos con la
misma estructura. Hoy no hay forma de indicar cómo interpretar el material al generar las preguntas.

## Objetivo

Que al cargar un material el usuario elija cómo se generan sus preguntas:

- **Basadas en el material** (default): preguntas sobre el contenido cargado, como hoy.
- **Preguntas similares**: el material es una guía; se generan preguntas con la misma estructura,
  mecánica y dificultad, pero con enunciados y datos distintos, sin preguntar nunca por los datos
  concretos de la guía.

## Alcance propuesto

- Enum `MaterialQuestionMode` (`BASED_ON_MATERIAL | SIMILAR_QUESTIONS`) en el modelo `Material`,
  con default `BASED_ON_MATERIAL`. El modo es una propiedad del material, no de la materia: dos
  materiales de una misma materia pueden tener modos distintos.
- Selector en la creación/carga de material (texto, archivo y borrador analizado con IA) con los dos
  valores; el default es "basadas en el material".
- Builder de prompts paramétrico por modo: `generateQuestionsSystemPrompt(mode)` con un bloque común
  (formato JSON, 4 opciones y 1 correcta, idioma del material, `imageIndex`) y un bloque por modo.
  El modo `SIMILAR_QUESTIONS` sustituye la regla "solo en el material" por la instrucción de
  estructura: usar el material solo como referencia de estructura/mecánica/dificultad; generar datos
  nuevos; nunca preguntar por los valores concretos de la guía (si la guía muestra
  `456 + 735 = 1191`, no preguntes por ese resultado; genera otras sumas de tres dígitos).
- Incluir el nombre de materia y tema en el contexto del mensaje del usuario
  (`generateQuestionsMessages`): hoy no viajan, y anclar la materia ayuda a respetar la mecánica en
  el modo "preguntas similares".

## Cambios implicados

### Backend
- `apps/api/prisma/schema.prisma`: enum `MaterialQuestionMode`, campo `questionMode` en `Material`
  (default `BASED_ON_MATERIAL`) y migración.
- `apps/api/src/modules/materials/presentation/dto/materials.dto.ts`: `questionMode` opcional en
  `CreateTextMaterialDto` y `UploadMaterialDto` (class-validator, `@IsEnum`), expuesto en
  `MaterialDto`.
- `apps/api/src/modules/ai/application/ports/ai-provider.ts`: `GenerateQuestionsInput` gana
  `questionMode` y los nombres de materia/tema.
- `apps/api/src/modules/materials/application/use-cases/process-material.use-case.ts`: pasar
  `material.questionMode` al llamar a `generateQuestions`.
- `apps/api/src/infrastructure/ai/deepseek/deepseek.prompts.ts` (+ `deepseek.provider.ts`):
  builder paramétrico por modo. El builder es una función pura y se puede testear por modo sin
  llamar a la API.
- Tests: el use case propaga el modo; cada modo produce su bloque de instrucciones.

### Frontend
- `apps/web/lib/api.ts`: tipos de `createMaterial`/`uploadMaterial` y `Material`.
- `apps/web/components/dialogs/material-dialog.tsx`: control segmentado ("Basadas en el material" /
  "Preguntas similares") con default lo primero, enviado al crear/subir.

## Fuera de alcance (por ahora)

- **Regenerar preguntas al cambiar el modo de un material ya procesado**: en el MVP no se regenera
  automáticamente; el modo aplica al próximo procesamiento y las preguntas ya generadas no se tocan
  (ver `docs/ToDo/ciclo-vida-preguntas-material.md`).
- Campo de instrucciones libres por materia (system prompt libre en `Subject`): descartado; el
  selector de valores cerrados cubre los dos casos identificados.
- Modo por defecto configurable por materia o tema.
- Cambiar la cantidad de preguntas por material (ver
  `docs/ToDo/preguntas-segun-longitud-material.md`).
- Modos adicionales (p. ej. "solo dificultad alta", "repaso de errores").

## Notas

- Decisión de diseño: se evaluó un system prompt libre por materia y se optó por un selector con
  valores cerrados. Es más robusto (no depende de que el usuario redacte buenos prompts), validable
  con class-validator, y el comportamiento de cada modo queda documentado en el código.
- Coherente con AGENTS.md: la lógica vive en application, el prompt en infrastructure (adaptador
  DeepSeek), el dominio no conoce proveedores y la salida de IA sigue validada con Zod
  (`deepseek.schemas.ts`, `generatedQuestionSchema`).
- El modo default reproduce literalmente el comportamiento actual (la regla "solo en el material"
  ya existe en el prompt), así que la migración es neutra para los materiales existentes.
- Relacionados: `docs/ToDo/ciclo-vida-preguntas-material.md` (regeneración al editar), y
  `docs/ToDo/modulo-evaluaciones.md` (el otro modo de enriquecer el pool de preguntas).
