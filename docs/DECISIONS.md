# Decisiones técnicas resumidas

| Tema | Decisión |
|---|---|
| Arquitectura | Modular Monolith |
| Backend | NestJS + Clean Architecture |
| Frontend | Next.js + React + TypeScript |
| UI | Tailwind + shadcn/ui |
| DB | PostgreSQL |
| ORM | Prisma |
| IAM MVP | Ninguno |
| IAM futuro | Authentico |
| IA inicial | DeepSeek |
| IA arquitectura | AIProvider + adapters |
| Storage | Abstracción ObjectStorage S3-compatible |
| Storage local (dev) | MinIO vía adapter S3 (endpoint/keys por env) |
| Proveedores storage | Backblaze B2 / Contabo (cambio solo por env) |
| Carga de material MVP | Texto pegado + foto de apuntes (multipart) |
| Redis | Fuera del MVP |
| Workers | Fuera del MVP |
| Jobs | On-demand |
| Billing | Fuera del MVP |
| Restricciones de uso | Ninguna |
| Desarrollo | Codex + Docker |
| Producción | Coolify |
| Mobile | Mobile-first web |
