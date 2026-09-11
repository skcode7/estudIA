# Requerimiento: preguntas ajustadas a la longitud del material

## Contexto

La integración de IA usa una cantidad fija de preguntas por material (`AI_QUESTIONS_PER_MATERIAL`, default 3). Eso no distingue entre un apunte corto (una página) y un material extenso (varias páginas de teoría), donde 3 preguntas quedan cortas o pueden no aportar suficiente repaso. Hoy no existe una métrica de extensión del contenido en `Material` (solo `content`/`storageKey`).

## Objetivo

Que el número de preguntas generadas se adapte a la longitud real del material: apunte corto → 1–2 preguntas; material extenso → 5 o más, sin que el usuario tenga que pedirlo.

## Alcance propuesto

- Calcular la extensión del contenido (p. ej. nº de caracteres/palabras del texto extraído, o nº de páginas si vienen del análisis de imágenes) en el proceso de material.
- Derivar un `count` dinámico para `generateQuestions` (posiblemente con bandas/cap en config por env).
- Mostrar en la UI el conteo resultante (ya se muestra `questionCount` junto al badge de estado).

## Cambios implicados

### Backend
- `ProcessMaterialUseCase`: estimación de longitud del contenido antes de `generateQuestions`.
- Config por env para bandas (p. ej. `AI_MIN_QUESTIONS`, `AI_MAX_QUESTIONS`, umbrales).

### Frontend
- Sin cambios (el conteo ya viene del DTO).

## Fuera de alcance (por ahora)

- Análisis semántico del contenido (el ajuste es por longitud, no por dificultad).

## Notas

- Reducir llamadas/consumo de API: materiales cortos gastan menos tokens.
- Referencia de diseño de prompts: `apps/api/src/infrastructure/ai/deepseek/deepseek.prompts.ts`.