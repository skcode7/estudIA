---
title: Arquitectura de estudIA
type: architecture
responsibility: El mapa del monolito modular: capas, puntos de entrada e infraestructura local, con lo que cada carpeta es dueña de hacer.
sources:
  - apps/api/src/main.ts
  - apps/api/src/app.module.ts
  - apps/web/app/page.tsx
  - apps/web/app/layout.tsx
  - package.json
  - apps/api/package.json
  - apps/web/package.json
  - docker-compose.yml
  - .env.example
synced: 36ec39f
---

# Arquitectura de estudIA

estudIA convierte materiales escolares (apuntes, textos, PDFs) en una experiencia de estudio:
temas, quizzes generados con IA y progreso. El MVP es de un solo usuario, sin autenticación, y
todo el procesamiento de IA es on-demand: no hay colas ni workers.

## El mapa

```
apps/web (Next.js 16, React 19)          apps/api (NestJS 12)
  app/page.tsx  ──HTTP JSON──────────►     main.ts (api/v1)
  hooks/ lib/api.ts                        modules/*  ──►  infrastructure/*
        │                                       │                │
        │                                       │                ├── Prisma ──► PostgreSQL
        │                                       │                ├── ObjectStorage ──► MinIO (S3)
        │                                       │                └── AI port ──► DeepSeek / OpenRouter
packages/types · packages/validation (zod) ────┘
```

Es un monorepo pnpm con Turborepo: dos aplicaciones en `apps/` y tres paquetes compartidos en
`packages/` (`package.json:11` orquesta todo con `turbo`). La regla del proyecto es *Modular
Monolith* antes que microservicios: un solo proceso de API, dividido en módulos NestJS.

## Las capas de `apps/api`

Cada módulo de dominio repite la misma separación en tres niveles, y el nivel superior nunca
importa el inferior por su implementación:

```
presentation/   controllers + DTOs (class-validator)      ← HTTP entra aquí
application/    use cases + ports (interfaces)             ← lógica de negocio, sin frameworks
infrastructure/ adaptadores (Prisma, S3, DeepSeek, sharp)  ← los proveedores concretos
```

`apps/api/src/app.module.ts:13` es la raíz: importa la infraestructura compartida (`PrismaModule`,
`ObjectStorageModule`, `AIModule`) y los módulos de dominio (`HealthModule`, `SubjectsModule`,
`TopicsModule`, `MaterialsModule`, `QuizzesModule`, `UsersModule`) en `apps/api/src/app.module.ts:14`. Los
puertos viven dentro de cada módulo, en `application/ports/`, de modo que un caso de uso depende
de una interfaz y no de Prisma ni de ningún SDK.

## Puntos de entrada

**API.** `bootstrap()` en `apps/api/src/main.ts:12` levanta Nest con prefijo global `api/v1`
(`apps/api/src/main.ts:14`), CORS restringido al origen de la web (`apps/api/src/main.ts:15`, el
valor sale de `WEB_URL`), un `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`
(`apps/api/src/main.ts:16`) que hace que un DTO sin declarar sea un error y no un campo ignorado,
Swagger en `api/docs` (`apps/api/src/main.ts:19`) y el puerto de `API_PORT` (`apps/api/src/main.ts:21`).
El `.env` se carga a mano desde `apps/api/.env` (`apps/api/src/main.ts:10`): el binario compilado
arranca desde `dist/`, así que `process.env` no se rellena solo.

**Web.** No hay router de páginas: una única página client-side, `apps/web/app/page.tsx:20`, decide
qué vista renderiza según la navegación (`apps/web/app/page.tsx:64`) y monta los diálogos globales.
El layout fija el idioma de la interfaz en español (`apps/web/app/layout.tsx:13`). La web habla solo
con `NEXT_PUBLIC_API_URL` (`apps/web/package.json:15`), sin cookies ni sesión.

**Infraestructura local.** `docker-compose.yml:2` levanta PostgreSQL 16 y `docker-compose.yml:20`
MinIO como storage S3-compatible; el bucket `estudia-materials` lo crea el servicio `minio-init`
(`docker-compose.yml:48`) y no existe hasta que ese contenedor corre. Las credenciales y endpoints
son variables de entorno (`docker-compose.yml:21` apunta al mismo MinIO que `.env.example:21`), de
modo que producción cambia de proveedor sin tocar código.

## Qué hay en cada carpeta

| Carpeta | Dueña de |
| --- | --- |
| `apps/api/src/modules/*` | los casos de dominio: materias, temas, materiales, quizzes, usuarios, health |
| `apps/api/src/infrastructure/ai` | los adaptadores de IA: cliente DeepSeek, cliente OpenRouter y el registro de proveedor |
| `apps/api/src/infrastructure/database`, `object-storage`, `images` | Prisma, S3 y el recorte de figuras con sharp |
| `apps/web/components`, `hooks`, `lib` | la interfaz: vistas, diálogos, hooks de datos y el cliente HTTP |
| `packages/types`, `packages/validation` | tipos compartidos y esquemas Zod (`packages/validation/src/index.ts` re-exporta `z`) |
| `apps/api/prisma/schema.prisma` | el modelo de datos; las migraciones son generadas y no se documentan |

## Las páginas de este mapa

| Página | Qué cubre |
| --- | --- |
| [Procesamiento de un material](./flows/procesamiento-de-material.md) | de la foto o el texto al material con preguntas |
| [Figuras embebidas](./flows/figuras-embebidas.md) | cómo se extraen, recortan y guardan los dibujos de una foto |
| [Generar y resolver un quiz](./flows/generar-y-resolver-quiz.md) | selección de preguntas, intento, corrección y progreso |
| [Módulo de materiales](./components/materiales.md) | `Material`, sus figuras, sus preguntas y su borrado |
| [Módulo de quizzes](./components/quizzes.md) | el quiz como instantánea, los intentos y `TopicProgress` |
| [Módulo de IA y sus adaptadores](./components/ia.md) | puertos de IA, proveedores y validación de la salida |
| [Materias, temas y usuarios](./components/catalogo.md) | la jerarquía de catálogo y sus cascadas |
| [Aplicación web](./components/web.md) | la página única, los hooks y el cliente HTTP |
| [Puertos y adaptadores](./concepts/puertos-y-adapters.md) | el patrón que repite cada módulo |
| [Configuración por entorno](./concepts/configuracion-por-entorno.md) | qué se lee al arrancar y qué al llamar |
| [DeepSeek y el modelo de visión](./decisions/proveedor-ia.md) | por qué un puerto y dos proveedores |
| [Storage S3 con MinIO](./decisions/storage-s3-minio.md) | por qué object storage y no disco ni Postgres |
| [Sin identidad en el MVP](./decisions/authentico.md) | por qué no hay login y dónde entra Authentico |
