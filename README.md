# estudIA — Documentación técnica

## Visión
estudIA convierte materiales y temas aprendidos en la escuela en una experiencia de estudio interactiva, con quizzes y retroalimentación asistida por IA.

## Estado actual
MVP individual, sin autenticación y sin restricciones de uso.

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
