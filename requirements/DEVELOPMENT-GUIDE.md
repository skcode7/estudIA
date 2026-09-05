# Guía de desarrollo local

## Requisitos
- Git
- Docker Desktop o Docker Engine + Compose
- Node.js LTS
- pnpm
- Codex

## Principio
La infraestructura debe correr en Docker. El código de Next.js/NestJS puede ejecutarse directamente en el host durante desarrollo para obtener ciclos rápidos.

Arquitectura local:

```text
Host
├── Next.js
├── NestJS
└── Codex

Docker
└── PostgreSQL
```

## Primeros pasos

```bash
git clone <repo>
cd estudia

pnpm install

docker compose up -d postgres

pnpm dev
```

Los comandos reales se ajustarán a la estructura generada.

## Variables de entorno

Mantener:
- `.env.example` versionado.
- `.env.local` / `.env` fuera de Git.
- Nunca incluir API keys.

Inicialmente:

```env
DATABASE_URL=
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=
```

## Flujo con Codex

Para cada tarea:

1. Leer `AGENTS.md`.
2. Leer la documentación relacionada.
3. Revisar código existente.
4. Formular un plan pequeño.
5. Implementar.
6. Ejecutar:
   - lint
   - typecheck
   - tests
7. Revisar diff.
8. Crear commit.

## Primera fase técnica

1. Inicializar monorepo.
2. Configurar Next.js.
3. Configurar NestJS.
4. Crear Docker Compose con PostgreSQL.
5. Configurar Prisma.
6. Crear health check de API.
7. Conectar API a PostgreSQL.
8. Crear módulo Subject.
9. Crear módulo Topic.
10. Crear UI mínima.
11. Añadir tests.
12. Implementar IA.
13. Implementar quizzes.
