# Requerimiento: validar el entorno al arrancar y completar `.env.example`

## Contexto

No hay validación de entorno al arrancar: una API sin `DEEPSEEK_API_KEY` levanta sana y solo falla al procesar el primer material (`wiki/concepts/configuracion-por-entorno.md`). El `.env` se carga a mano desde `apps/api/.env` (`apps/api/src/main.ts`); si falta, la app arranca igual.

`.env.example` no lista `QUIZ_QUESTIONS_COUNT`, que `quizzes.module.ts` sí lee (`parsePositiveInt(process.env.QUIZ_QUESTIONS_COUNT, 3)`). Descubrirlo exige mirar el código.

Los números mal escritos no tumban la API (`parsePositiveInt` cae al defecto); las claves de IA y S3 se leen en momentos distintos (arranque vs cada llamada), lo que ya confunde en despliegue.

## Objetivo

Que un arranque local o un deploy falle pronto y con el nombre de la variable que falta cuando esa variable es imprescindible para el proceso, y que `.env.example` sea la lista completa de lo que el código lee.

## Alcance propuesto

- Documentar en `.env.example` `QUIZ_QUESTIONS_COUNT` (y cualquier otra variable que el código lea y el ejemplo omita).
- Validación mínima al bootstrap de las variables que, si faltan, hacen inútil el proceso en ese entorno (p. ej. `DATABASE_URL`; opcionalmente avisar si `AI_PROVIDER=deepseek` y no hay `DEEPSEEK_API_KEY`).
- No exigir claves de IA en entornos que solo levantan CRUD (el MVP local debe poder arrancar sin DeepSeek si no se procesa).
- Mensajes que nombren la variable exacta, como ya hacen los clientes de IA al llamar.

## Cambios implicados

### Backend
- `.env.example` (raíz) y, si existe copia, `apps/api/.env.example`.
- `apps/api/src/main.ts` o un chequeo en `AppModule`: validar presencia de `DATABASE_URL` / S3 si se construye el cliente al arrancar.
- Tests: no tumbar la suite; el chequeo debe respetar defaults de `parsePositiveInt`.

### Frontend
- Sin cambios (salvo si se documenta `NEXT_PUBLIC_API_URL` junto al resto).

## Fuera de alcance (por ahora)

- Módulo Nest `ConfigModule` centralizado.
- Logging estructurado (`docs/ToDo/logging-errores-originales.md` cubre el catch de S3/DeepSeek).
- Health check que toque PostgreSQL o MinIO (`GET /health` sigue siendo sonda de proceso).

## Notas

- Hallazgo del wiki: `wiki/concepts/configuracion-por-entorno.md`.
- Coherencia con AGENTS.md: no sobreingenierizar; no hace falta un framework de config, sí un contrato de env completo y un fail-fast de lo crítico.
- Relacionado: incidente B2 del 2026-09-17 (`docs/ToDo/logging-errores-originales.md`).
