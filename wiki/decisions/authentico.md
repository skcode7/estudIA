---
title: Login con Authentico (etapa 2), frontera para roles
type: decision
responsibility: Cómo se integró el login con Authentico (SDK + adapter), qué queda diferido (roles/guards) y cómo convive con el User local.
options: Login propio con contraseñas y sesiones · integrar Authentico desde el inicio · identidad mínima con frontera preparada
sources:
  - requirements/ADR-0004-AUTHENTICO-LOGIN.md
  - apps/api/src/modules/auth/application/ports/auth-provider.ts
  - apps/api/src/modules/auth/infrastructure/authentico-auth.provider.ts
  - apps/api/src/modules/auth/presentation/controllers/auth.controller.ts
  - apps/web/hooks/use-user.ts
  - apps/web/lib/auth-session.ts
synced: 1ea05de
confidence: high
related:
  - ../components/catalogo.md
---

# Login con Authentico (etapa 2), frontera para roles

estudIA se valida primero con una persona, por eso el MVP no tuvo identidad (ADR-0003). En la
etapa 2 se integró el **login** con Authentico mediante `@ed_open/authentico-sdk` (adapter
`AuthenticoAuthProvider` en `modules/auth/`, ADR-0004). Sigue sin haber contraseñas ni
sesiones propias: el `SessionId` es opaco y lo emite Authentico.

Roles, guards, multiusuario y validación de sesión (GetSessionInfo) siguen diferidos al plan
de roles (`docs/ToDo/roles-tutor-alumno.md`).

## Qué hay en su lugar

Un modelo `User` que es solo un nombre (`users.controller.ts` expone crear y listar,
`apps/api/src/modules/users/presentation/controllers/users.controller.ts:15`), y una convención en
la web: el primer usuario de la lista es "el usuario", y si no hay ninguno se abre el onboarding
(`apps/web/hooks/use-user.ts:21`). No hay contraseña, ni token, ni cookie, ni relación entre el
usuario y sus materias: las materias y los materiales no tienen dueño.

## Lo que se descartó

**Login propio.** AGENTS.md lo prohíbe salvo lo estrictamente necesario para desarrollo local, y
con razón: un IAM casero es exactamente el tipo de código que hay que no escribir dos veces.
**Integrar Authentico ya** habría obligado a flujos de consentimiento y a un modelo de usuario
externo antes de tener usuarios reales.

## Consecuencias

- **Todos los endpoints son públicos.** Cualquiera con la URL de la API lee y borra todo; la única
  barrera real es el CORS, que solo admite el origen de la web (`apps/api/src/main.ts:15`). Para el
  MVP de una persona en local es suficiente; **no lo es para un despliegue público**.
- La frontera está en el borde de la aplicación: cuando Authentico entre, será un guard/middleware
  en la capa `presentation` y una columna de dueño donde haga falta. Los casos de uso no cambian:
  no saben quién llama.
- El `User` actual no se reutilizará como identidad: es un perfil local sin credenciales. La
  migración implicará ligarlo al subject externo de Authentico o retirarlo.

## Cuándo revisarla

Antes del primer despliegue accesible desde internet, que es cuando "cualquiera con la URL" deja
de ser una abstracción. La guía de requisitos pendientes ya tiene el hueco documentado en
`docs/ToDo/frontera-identity-provider.md`.
