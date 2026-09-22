# Requerimiento: materializar la frontera IdentityProvider (preparación para Authentico)

## Contexto

AGENTS.md (sección Authentico) exige que, aunque en el MVP no haya integración activa, "Sí debe existir una frontera arquitectónica preparada para incorporarla posteriormente". Hoy esa frontera es solo documental:

- `requirements/ADR-0003-AUTHENTICO-LATER.md` — documenta la decisión de diferir Authentico y describe la frontera `IdentityProvider`.
- `architecture/ARCHITECTURE.md` §7 — define la interfaz:

```ts
interface IdentityProvider {
  validateToken(token: string): Promise<Identity>;
  getIdentity(token: string): Promise<Identity>;
}
```

- En el código NO existe ningún archivo, interfaz, stub ni módulo que materialice `IdentityProvider`. No hay punto de anclaje para cuando llegue la etapa 2.

Referencia: recomendación 4 de la revisión de arquitectura (Oracle, 21/09). Ver `docs/history/2026-09-22-recomendaciones-arquitectura.md`.

## Objetivo

Crear la frontera mínima en código — un port `IdentityProvider` en la capa application y un `DevelopmentIdentityProvider` que devuelva un usuario local — para que la futura integración con Authentico tenga un punto de anclaje definido, sin implementar auth real.

## Alcance propuesto

- Port `IdentityProvider` (abstract class o interface) en `application` (siguiendo el patrón de `modules/ai/application/ports/ai-provider.ts` y `modules/storage/application/ports/object-storage.ts`).
- `DevelopmentIdentityProvider` (infrastructure) que devuelva un `Identity` local hardcodeado para desarrollo.
- Módulo NestJS que provea el port, sin integración activa en controllers/use cases.
- Mantener `ADR-0003` y `ARCHITECTURE.md` §7 coherentes con lo implementado.

## Cambios implicados

### Backend
- Nuevo módulo (p. ej. `modules/identity/`) con `application/ports/identity-provider.ts` + `infrastructure/development-identity.provider.ts` + módulo `@Global()` o de ámbito acotado.
- `app.module.ts` — registrar el módulo.
- Tests: spec del `DevelopmentIdentityProvider` (devuelve el usuario local).

### Frontend
- Sin cambios.

## Fuera de alcance (por ahora)

- Validación real de tokens contra Authentico.
- Sesiones, cookies, credenciales o login propio (AGENTS.md lo prohíbe en el MVP).
- Roles, multiusuario, billing.

## Notas

- Coherencia con AGENTS.md: "No crear contraseñas, sesiones ni credenciales propias salvo lo estrictamente necesario para desarrollo local"; el `DevelopmentIdentityProvider` es exactamente esa concesión mínima.
- Decisión de sesión: esta recomendación se implementará junto con el trabajo de integración de Authentico (etapa 2), no ahora.
- Relacionado: recomendaciones 1, 2 y 3 ya implementadas; 7 (Zod), 9 y 10 registradas como `docs/ToDo`.
