# Requerimiento: evitar el parpadeo del onboarding durante la carga del usuario

## Contexto

`apps/web/app/page.tsx:51` muestra `UserOnboardingDialog` cuando `user.isUserLoading || user.isUserModalOpen`:

```tsx
{(user.isUserLoading || user.isUserModalOpen) && (
  <UserOnboardingDialog ... />
)}
```

`useUser` (`apps/web/hooks/use-user.ts:14-38`) arranca con `isUserLoading = true` y resuelve `listUsers()` después. Resultado: **en cada carga de la página se ve el modal de onboarding aunque el usuario ya exista**, y detrás se alcanza a ver el saludo vacío ("¡Hola, ! 👋") porque `userName` es `""` hasta que responde la API.

Reproducción verificada: retrasando `GET /api/v1/users` 5 segundos con `playwright-cli` (`page.route`) y recargando, el modal "¡Hola! 👋" apareció con el saludo de fondo todavía vacío. Sin el retraso, el modal se alcanza a ver un instante y desaparece al llegar la respuesta.

Riesgo adicional: si el usuario escribe un nombre y pulsa "Comenzar" durante esa ventana, `saveUser` ejecuta `createUser` (`use-user.ts:40-53`); el MVP es de un solo usuario y `loadUser` toma `users[0]` (`use-user.ts:21-22`). Se crearía un segundo usuario en la base y el nombre mostrado podría no ser el que el usuario acaba de escribir.

## Objetivo

Que el onboarding aparezca solo cuando la API haya confirmado que no hay usuario, y que durante la carga no se muestre un formulario que pueda crear datos duplicados.

## Alcance propuesto

### Frontend

- Cambiar la condición de render a `!user.isUserLoading && user.isUserModalOpen` (o exponer `needsOnboarding` desde `useUser`, que ya distingue los estados).
- Mientras `isUserLoading`, mostrar un estado neutro (skeleton del shell o un indicador "Cargando…") en lugar del modal y del saludo vacío. Evitar también habilitar "Agregar material"/"Nueva materia" antes de saber si hay usuario.
- En `saveUser`, rechazar el envío si la carga inicial aún no terminó (defensa en profundidad) y no cerrar el modal ante un error.
- Añadir una prueba del hook con `listUsers` mockeado: (a) respuesta lenta con usuario existente → nunca abre el modal; (b) lista vacía → abre; (c) error → abre con el mensaje correspondiente a `docs/ToDo/modal-onboarding-vs-api-caida.md`.

### Backend

- Ninguno obligatorio. Si se quiere blindar el modo un usuario, una restricción/validación de unicidad en `POST /users` es una decisión aparte.

## Fuera de alcance (por ahora)

- Diferenciar "API caída" de "sin usuario" (ya está en `docs/ToDo/modal-onboarding-vs-api-caida.md`).
- Autenticación o multiusuario.
- Persistir el nombre en `localStorage`.

## Notas

- Evidencia: `playwright-cli run-code` con `page.route('**/api/v1/users', ...)` + 5 s de espera; al recargar, `document.querySelector('[role=dialog]')` existe y el saludo del header es "¡Hola, ! 👋".
- No se probó el submit durante la carga para no crear un usuario duplicado en la base de desarrollo; el riesgo se deduce de `saveUser` + `listUsers()[0]`.
- Coherente con AGENTS.md: un solo usuario, sin infraestructura extra; el arreglo es de estado de carga, no de arquitectura.
