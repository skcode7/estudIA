---
title: Autenticación (Authentico)
type: entity
responsibility: Frontera de identidad materializada: login con Authentico vía SDK, adaptador y controller HTTP.
sources:
  - apps/api/src/modules/auth/application/ports/auth-provider.ts
  - apps/api/src/modules/auth/application/use-cases/sign-in.use-case.ts
  - apps/api/src/modules/auth/infrastructure/authentico-auth.provider.ts
  - apps/api/src/modules/auth/presentation/controllers/auth.controller.ts
  - apps/api/src/modules/auth/presentation/dto/auth.dto.ts
  - apps/api/src/modules/auth/auth.module.ts
  - apps/api/src/modules/auth/auth.errors.ts
  - apps/web/hooks/use-user.ts
  - apps/web/lib/auth-session.ts
  - apps/web/lib/api.ts
  - apps/web/components/dialogs/login-dialog.tsx
synced: 6f8cbd0
related:
  - ../decisions/authentico.md
  - ../concepts/puertos-y-adapters.md
---

# Autenticación (Authentico)

`modules/auth/` materializa la frontera de identidad (ADR-0004). El port `AuthProvider`
(`application/ports/auth-provider.ts`) expone solo `signIn`; los casos de uso dependen de él,
nunca del SDK concreto. El adapter `AuthenticoAuthProvider` envuelve `@ed_open/authentico-sdk`
y traduce sus errores tipados (`BusinessRejectionError`, `TransportError`,
`ConfigurationError`) a errores de dominio (`AuthRejectedError`, `AuthUnavailableError`,
`AuthConfigError`).

El controller `AuthController` expone `POST /api/v1/auth/login` con DTO class-validator y mapea
los errores a HTTP (401 / 502 / 500). La config se lee de env con fail-fast al arranque.

En la web, `use-user.ts` consume `signIn` y persiste el `SessionId` mediante
`auth-session.ts` (cookie de 14 días si "Recuérdame", `sessionStorage` si no), haciendo
find-or-create del `User` local por login. `lib/api.ts` inyecta `X-Session-Id` en cada llamada.

Roles, guards y validación de sesión (`GetSessionInfo`) quedan para el plan de roles, cuando el
SDK los exponga (>= 0.2).