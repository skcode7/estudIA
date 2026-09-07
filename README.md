# estudIA — Documentación técnica

## Visión
estudIA convierte materiales y temas aprendidos en la escuela en una experiencia de estudio interactiva, con quizzes y retroalimentación asistida por IA.

## Estado actual
MVP individual, sin autenticación y sin restricciones de uso.

## Ejecutar y verificar el proyecto inicial

Requisitos: Node.js `22.22.2`, pnpm `12.3.4` y Docker con Compose. Si utilizas nvm, activa la versión fijada con `nvm use`.

```bash
pnpm install
docker compose up -d postgres
cp .env.example apps/api/.env
pnpm db:deploy
pnpm dev
```

Con `pnpm dev` en ejecución, verifica en otra terminal:

```bash
curl http://localhost:3001/api/v1/health
```

La respuesta esperada es:

```json
{"status":"ok"}
```

También puedes abrir `http://localhost:3000` para comprobar la página inicial de Next.js y `http://localhost:3001/api/docs` para ver el contrato OpenAPI de la API.

Para detener PostgreSQL al terminar:

```bash
docker compose down
```

## Arquitectura
Modular Monolith:
- `apps/web`: frontend Next.js.
- `apps/api`: backend NestJS.
- PostgreSQL como fuente de verdad.
- Prisma como ORM.
- Procesamiento IA on-demand.
- DeepSeek como primer proveedor mediante adapter.
- Object Storage S3-compatible preparado, pero incorporar solo cuando el MVP lo necesite.

## Evolución prevista
Etapa 2:
- Integración con Authentico.
- Multiusuario.
- Roles/perfiles.
- Storage externo.
- Procesamiento asíncrono si las métricas lo justifican.

Etapa posterior:
- Evaluar modelo SaaS o lifetime.
- Evaluar cache/colas/workers según necesidades reales.

## Regla de oro
El MVP debe resolver muy bien el ciclo:
material/tema -> preguntas -> quiz -> resultado -> progreso.
