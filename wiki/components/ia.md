---
title: Módulo de IA y sus adaptadores
type: entity
responsibility: Dueño de la frontera con los modelos: qué puertos exponen los casos de uso, qué proveedor responde a cada trabajo y cómo se valida lo que el modelo devuelve.
sources:
  - apps/api/src/modules/ai/ai.module.ts
  - apps/api/src/modules/ai/application/ports/ai-provider.ts
  - apps/api/src/infrastructure/ai/ai.registry.ts
  - apps/api/src/infrastructure/ai/deepseek/deepseek.provider.ts
  - apps/api/src/infrastructure/ai/deepseek/deepseek.client.ts
  - apps/api/src/infrastructure/ai/deepseek/deepseek.prompts.ts
  - apps/api/src/infrastructure/ai/model-output.ts
  - apps/api/src/infrastructure/ai/openrouter/openrouter.client.ts
synced: 36ec39f
related:
  - ../flows/figuras-embebidas.md
  - ../decisions/proveedor-ia.md
---

# Módulo de IA y sus adaptadores

Ningún caso de uso conoce DeepSeek ni OpenRouter: conoce `AIProvider` y `MaterialImageExtractor`,
dos clases abstractas que funcionan como token de inyección (`apps/api/src/modules/ai/application/ports/ai-provider.ts:97`).
Esta es la frontera que AGENTS.md exige — Controller → Use Case → puerto → adaptador — y el motivo
es el punto de fuga más caro del proyecto: cambiar de proveedor de IA no debe tocar el dominio.

## Un módulo global para dos trabajos distintos

`AIModule` es `@Global()` (`apps/api/src/modules/ai/ai.module.ts:12`): se importa una vez en
`AppModule` y sus tres puertos quedan disponibles en todos los módulos
(`apps/api/src/modules/ai/ai.module.ts:34`). Dentro decide dos cosas al arrancar:

- **Quién responde como `AIProvider`**, según `AI_PROVIDER` vía el registry
  (`apps/api/src/infrastructure/ai/ai.registry.ts:24`). Hoy solo existe `deepseek`; un valor
  desconocido tira el arranque en vez de fallar tarde
  (`apps/api/src/infrastructure/ai/ai.registry.ts:19`).
- **Quién extrae figuras**, según haya `OPENROUTER_API_KEY`
  (`apps/api/src/modules/ai/ai.module.ts:25`): el extractor de OpenRouter o un noop que no extrae
  nada.

Dos proveedores por dos trabajos: DeepSeek hace el lenguaje (analizar el material, generar
preguntas) y un modelo de visión de OpenRouter localiza las figuras de la foto. Son independientes:
uno puede estar configurado y el otro no.

## El contrato con el modelo es JSON, y se comprueba

Los prompts piden un objeto JSON con un formato fijado en el propio prompt
(`apps/api/src/infrastructure/ai/deepseek/deepseek.prompts.ts:45`), con reglas explícitas como
"nunca inventes ids" para que el modelo solo elija del catálogo que se le pasa. En las llamadas de
DeepSeek se pide además `response_format: json_object`
(`apps/api/src/infrastructure/ai/deepseek/deepseek.client.ts:31`).

Aun así **nada se fía de la salida**: `parseModelJson` quita las vallas ``` que los modelos añaden,
hace `JSON.parse` y valida con Zod (`apps/api/src/infrastructure/ai/model-output.ts:10`). Un JSON
roto o un campo fuera de contrato son un `ModelOutputError` que los casos de uso convierten en
`FAILED` (procesamiento) o en `503` (análisis de borrador). Es el motivo por el que la API usa
Zod para la salida de IA y class-validator para los DTOs de entrada.

Tras validar, el adaptador de DeepSeek todavía filtra lo que no cuadra: una pregunta cuyo
`imageIndex` no corresponde a ninguna figura real se descarta y un juego sin ninguna pregunta
válida es un error (`apps/api/src/infrastructure/ai/deepseek/deepseek.provider.ts:54`), de modo que
una alucinación del modelo no llega a la base de datos.

## Configuración

Los clientes leen la configuración **en cada llamada** desde `process.env`: `DEEPSEEK_API_KEY` y
`DEEPSEEK_MODEL` (`apps/api/src/infrastructure/ai/deepseek/deepseek.client.ts:61`), y
`OPENROUTER_API_KEY` con `IMAGE_EXTRACTION_MODEL`
(`apps/api/src/infrastructure/ai/openrouter/openrouter.client.ts:57`). Si falta la clave, la
excepción lo dice con el nombre exacto de la variable que hay que crear.

Dos matices que suelen sorprender: la temperatura está fijada en cada cliente (0.2 en DeepSeek, 0.1
en OpenRouter), no es configurable por entorno; y la decisión de qué extractor se inyecta se toma
una vez al arrancar, mientras que la clave se lee al llamar — una variable definida después del
arranque arregla las llamadas pero no cambia el extractor inyectado.

## Dos capacidades sin uso

`AIProvider` declara `explainAnswer` y `generateHint`
(`apps/api/src/modules/ai/application/ports/ai-provider.ts:100`) y DeepSeek los implementa
(`apps/api/src/infrastructure/ai/deepseek/deepseek.provider.ts:63`), pero ningún caso de uso los
invoca hoy: solo aparecen en los mocks de los tests. Están para la explicación de respuestas y las
pistas del quiz futuro; no confundir con la `explanation` de las preguntas, que sí se genera al
procesar el material.
