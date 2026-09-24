---
title: Sin identidad en el MVP, con frontera para Authentico
type: decision
responsibility: Por qué el MVP no tiene login ni sesiones, qué es hoy "el usuario" y dónde entra Authentico cuando toque.
options: Login propio con contraseñas y sesiones · integrar Authentico desde el inicio · identidad mínima con frontera preparada
sources:
  - requirements/ADR-0003-AUTHENTICO-LATER.md
  - apps/api/src/modules/users/presentation/controllers/users.controller.ts
  - apps/web/hooks/use-user.ts
  - apps/api/src/main.ts
synced: 36ec39f
confidence: high
related:
  - ../components/catalogo.md
---

# Sin identidad en el MVP, con frontera para Authentico

estudIA se valida primero con una persona. Meter autenticación antes de saber si el producto
sirve añade complejidad — contraseñas, sesiones, recuperación, protección de endpoints — sin
aportar nada al aprendizaje. La decisión (ADR-0003) es no integrar identidad en el MVP y dejar
preparado el hueco para Authentico, el IAM del ecosistema.

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
