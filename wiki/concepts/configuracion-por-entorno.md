---
title: Configuración por entorno
type: concept
responsibility: Cómo llega la configuración a la API — qué se lee al arrancar, qué se lee al llamar y cómo se inyectan los números ajustables — y por qué `apps/api/.env` importa.
sources:
  - apps/api/src/shared/env.utils.ts
  - apps/api/src/modules/materials/materials.module.ts
  - apps/api/src/modules/quizzes/quizzes.module.ts
  - apps/api/src/main.ts
  - apps/api/src/infrastructure/ai/deepseek/deepseek.client.ts
  - apps/api/src/infrastructure/object-storage/s3.object-storage.ts
  - .env.example
synced: 36ec39f
related:
  - ../components/ia.md
---

# Configuración por entorno

Toda la configuración del proyecto es `process.env`, sin un módulo de config centralizado. El
contrato completo está escrito en `.env.example`, que es lo que hay que leer para saber qué existe;
la copia real vive en `apps/api/.env` y **cada entorno la repone a mano**.

## El `.env` no se carga solo

`main.ts` lo carga explícitamente con `dotenv` apuntando a `apps/api/.env`
(`apps/api/src/main.ts:10`): la API arranca desde `dist/`, y nada en Nest rellena `process.env`.
Si falta ese archivo la app arranca igualmente y falla después, cuando algo echa en falta una
variable — el error típico del primer despliegue.

## Dos momentos de resolución

Este es el matiz que más confusión causa, porque el código no es uniforme:

- **Al arrancar.** El módulo Nest lee la variable una vez y fija la decisión: qué proveedor de IA
  resuelve el registry y qué extractor de imágenes se inyecta
  (`apps/api/src/modules/ai/ai.module.ts:25`), y el `S3Client` se construye con su endpoint y sus
  credenciales en el constructor (`apps/api/src/infrastructure/object-storage/s3.object-storage.ts:17`).
  Cambiar la variable después de arrancar no cambia esas decisiones.
- **En cada llamada.** Los clientes de IA leen su clave y su modelo por petición
  (`apps/api/src/infrastructure/ai/deepseek/deepseek.client.ts:61`): aquí sí basta con que la
  variable exista cuando se llama, y si falta, la excepción nombra la variable exacta.

## Los números ajustables entran como config inyectada

Los casos de uso no leen `process.env`: cada módulo define un token de config y lo construye con
una fábrica — `PROCESS_MATERIAL_CONFIG` con las preguntas por material
(`apps/api/src/modules/materials/materials.module.ts:46`) y `GENERATE_QUIZ_CONFIG` con las
preguntas del quiz (`apps/api/src/modules/quizzes/quizzes.module.ts:23`). Eso los hace testeables
sin tocar el entorno y hace del módulo el sitio donde se ve todo lo configurable.

Ambos usan `parsePositiveInt` (`apps/api/src/shared/env.utils.ts:1`), que cae al valor por defecto
ante ausencia, texto o números no positivos: `AI_QUESTIONS_PER_MATERIAL=abc` no rompe el arranque,
da 3. Es una regla pequeña y constante — **un valor mal escrito nunca tumba la API, usa el
defecto** — que conviene no romper al añadir variables nuevas.

## Lo que la configuración no cubre todavía

No hay validación de entorno al arrancar: una API sin `DEEPSEEK_API_KEY` levanta sana y solo falla
al procesar el primer material. Y `.env.example` no lista `QUIZ_QUESTIONS_COUNT`, que el módulo de
quizzes sí lee: descubrirlo exige mirar el código.
