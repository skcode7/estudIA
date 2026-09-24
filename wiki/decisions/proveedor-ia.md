---
title: DeepSeek detrás de un puerto, con un modelo de visión aparte
type: decision
responsibility: Por qué la IA se usa siempre a través de AIProvider, por qué DeepSeek es el primer proveedor y por qué las figuras van a un segundo proveedor en OpenRouter.
options: Llamada directa al proveedor desde los casos de uso · un solo modelo para texto y visión · proveedor propio de visión
sources:
  - requirements/ADR-0002-AI-PROVIDER.md
  - apps/api/src/modules/ai/application/ports/ai-provider.ts
  - apps/api/src/modules/ai/ai.module.ts
  - apps/api/src/infrastructure/ai/ai.registry.ts
  - apps/api/src/infrastructure/ai/deepseek/deepseek.provider.ts
synced: 36ec39f
confidence: high
related:
  - ../components/ia.md
  - ../flows/figuras-embebidas.md
---

# DeepSeek detrás de un puerto, con un modelo de visión aparte

La IA es la parte del producto que más va a cambiar de proveedor, de modelo y de precio. La
decisión (ADR-0002) fue poner esa incertidumbre detrás de un puerto desde el primer día, y el
código la respeta: ningún caso de uso importa nada de `infrastructure/ai`.

## Qué se decidió

DeepSeek es el proveedor inicial de lenguaje, y se accede **solo** mediante `AIProvider`
(`apps/api/src/modules/ai/application/ports/ai-provider.ts:97`). Los prompts, los mapeos de
respuesta y la validación Zod quedan en `infrastructure/ai`, de modo que el dominio ve tipos
propios (`MaterialAnalysis`, `GeneratedQuestion`) y no el formato del proveedor. Un registry
decide qué implementación responde (`apps/api/src/infrastructure/ai/ai.registry.ts:24`), y añadir
otro proveedor es añadir un adaptador y un caso al switch, no tocar los casos de uso.

## Lo que se descartó

**Llamar a DeepSeek directamente desde los casos de uso.** Habría sido menos código y un día más
rápido, pero ata la lógica de negocio al SDK, hace imposible el test sin red y convierte un cambio
de proveedor en una reescritura. Es además la regla expresa de AGENTS.md.

**Un solo modelo para todo.** Los apuntes fotografiados traen banderas, mapas y esquemas que un
modelo de texto ni describe bien ni puede ubicar. La alternativa de pedirle a DeepSeek que
describiera las figuras producía descripciones sin posición, inservibles para recortar. Se optó
por un modelo especialista de visión en OpenRouter que devuelve **regiones con coordenadas**
(`apps/api/src/infrastructure/ai/openrouter/openrouter.image-extractor.ts:22`), y sharp hace el
recorte en local. Los commits `22f0a62` y `c3a39db` son esa historia: primero "análisis con
figuras embebidas", después el modelo especialista y el recorte.

## Consecuencias

- Dos proveedores, dos claves (`DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`) y dos configuraciones
  independientes: uno puede estar activo sin el otro.
- Los prompts viven en `infrastructure` (`deepseek.prompts.ts`, `openrouter.prompts.ts`): ajustar
  el comportamiento del modelo es un cambio de adaptador, no de dominio.
- La calidad de salida se defiende en la frontera: JSON validado con Zod y preguntas descartadas
  si su `imageIndex` no corresponde a una figura real
  (`apps/api/src/infrastructure/ai/deepseek/deepseek.provider.ts:53`). Es el precio de confiar en
  un modelo: la validación es parte del adaptador.

## Cuándo revisarla

Si un proveedor nuevo da mejor relación precio/calidad en visión, solo hay que tocar
`AIModule` y el adaptador. Si aparece un caso de uso que necesite streaming o respuestas
estructuradas distintas, el puerto `AIProvider` habrá crecido y convendrá partirlo antes de
ensuciar los casos de uso.
