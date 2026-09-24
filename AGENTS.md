# estudIA — Instrucciones para agentes de código

## Objetivo
estudIA es una aplicación mobile-first que ayuda al estudiante a estudiar únicamente contenidos proporcionados por su contexto escolar. El MVP será utilizado inicialmente por una sola persona.

## Principios
- Priorizar simplicidad y velocidad de iteración.
- Modular Monolith antes que microservicios.
- Clean Architecture en el backend.
- Domain y application no dependen de frameworks ni proveedores externos.
- Mobile-first, accesible y amigable.
- No implementar infraestructura que no tenga una necesidad real.
- Preferir soluciones maduras, estables y bien documentadas.
- No sobreingenierizar el MVP.

## Stack
- Frontend: Next.js + React + TypeScript.
- Backend: NestJS + TypeScript.
- Database: PostgreSQL + Prisma.
- UI: Tailwind CSS + shadcn/ui.
- Validación: class-validator (DTOs de la API) + Zod (salida de IA).
- Tests: Vitest + Playwright.
- Desarrollo: Docker + Codex.
- Producción futura: Coolify.
- Object Storage futuro: S3-compatible (Backblaze B2 o Contabo Object Storage).
- IA inicial: DeepSeek mediante un adapter propio.

## MVP
Implementar únicamente:
1. Materias.
2. Temas.
3. Materiales de estudio.
4. Procesamiento de materiales on-demand.
5. Generación de preguntas mediante IA.
6. Quiz.
7. Respuestas y resultado.
8. Progreso básico.

No implementar todavía:
- Authentico.
- Registro/login.
- Multiusuario.
- Roles.
- Billing.
- SaaS/lifetime.
- Redis.
- Workers/BullMQ.
- Notificaciones.
- App móvil nativa.
- Microservicios.

## Authentico
Authentico será la solución IAM futura. En el MVP no debe existir integración activa.
Sí debe existir una frontera arquitectónica preparada para incorporarla posteriormente. No crear contraseñas, sesiones ni credenciales propias salvo lo estrictamente necesario para desarrollo local.

## IA
Nunca llamar DeepSeek directamente desde controllers o casos de uso.
Usar:
Controller -> Use Case -> AI application port -> AI provider adapter.

El dominio no conoce proveedores.
Los casos de uso dependen de interfaces.
La implementación DeepSeek vive en infrastructure.

El sistema debe permitir añadir posteriormente otros proveedores compatibles sin modificar los casos de uso.

## Storage
Usar una abstracción ObjectStorage compatible con S3. El proveedor concreto será configurable por entorno.
Para desarrollo local se usa MinIO como implementación S3-compatible (endpoint/key por env); en producción el proveedor real (Backblaze B2, Contabo u otro S3) se configura solo con variables de entorno, sin tocar los casos de uso.
No incorporar Redis.

## Procesamiento
En el MVP usar operaciones on-demand. Si una operación se vuelve lenta o requiere ejecución asíncrona, diseñar primero la interfaz de aplicación y posteriormente introducir una cola/worker sin modificar el dominio.

## Calidad
- No dejar lógica de negocio en controllers.
- No acceder a Prisma desde domain/application.
- Validar inputs.
- Manejar errores explícitamente.
- Añadir tests a casos de uso importantes.
- Mantener funciones pequeñas.
- Evitar duplicación.
- Documentar decisiones arquitectónicas relevantes.

## Codex
Antes de modificar código:
1. Leer AGENTS.md.
2. Revisar la estructura existente.
3. Identificar la capa afectada.
4. Proponer cambios pequeños.
5. Implementar.
6. Ejecutar lint, typecheck y tests relevantes.
7. Resumir archivos modificados y validaciones realizadas.
8. Realizar commits atómicos.

Nunca rehacer arquitectura existente sin justificarlo.

## Documentación de sesiones (docs/history)
Solo cuando el usuario lo pida explícitamente ("guarda un resumen de la sesión", "registra lo hecho hoy", similar):
1. Revisar `docs/history/` para respetar el formato, estilo y numeración de archivos existentes.
2. Crear `docs/history/YYYY-MM-DD-tema.md` (`tema` en kebab-case, p. ej. `crud-materias`).
3. Escribir el resumen en español con la estructura establecida: Contexto, Cambios realizados (Backend / Frontend / Documentación, enumerando archivos por capa), Validaciones (tsc/lint/tests y resultado), tabla de Commits (hash abreviado de 7 chars + mensaje vía `git log`) y Pendientes/próximos pasos.
4. Informar al usuario de la ruta creada.

No crear resúmenes de sesión automáticamente al terminar tareas.

## Requerimientos pendientes (docs/ToDo)
Solo cuando el usuario lo pida explícitamente ("agrégalo en el ToDo", "guarda este requerimiento para después", similar):
1. Revisar `docs/ToDo/` para respetar el formato y estilo de archivos existentes.
2. Crear `docs/ToDo/<slug>.md` (`slug` en kebab-case, p. ej. `paginacion-materias`).
3. Escribir el requerimiento en español con la estructura establecida: Contexto (citando rutas y comportamiento actual reales del repo), Objetivo, Alcance propuesto, Cambios implicados (Backend / Frontend), Fuera de alcance (por ahora) y Notas (decisiones, coherencia con AGENTS.md, referencias a requerimientos relacionados).
4. Solo documentar: no implementar código asociado al requerimiento.
5. Informar al usuario de la ruta creada.

<!-- wikipoke:start · managed by wikipoke: `wikipoke hooks remove agents` takes this block out -->
## Code wiki

This repository keeps a code wiki in `wiki/`, maintained with the skills in `.agents/skills/`:
`wikipoke-ingest` updates it, `wikipoke-query` answers from it, `wikipoke-lint` reviews it. At
the start of a session, run `sh wiki/.wikipoke-hook.sh` and act on what it prints; it is silent
when the wiki is current.
<!-- wikipoke:end -->
