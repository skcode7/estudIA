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
- Validación: Zod.
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
No incorporar MinIO.
No incorporar Redis.
Cuando se implemente almacenamiento de archivos, usar una abstracción ObjectStorage compatible con S3. El proveedor concreto será configurable.

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
