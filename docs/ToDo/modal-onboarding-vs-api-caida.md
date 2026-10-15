# Requerimiento: distinguir "API caída" de "sin usuario" en la modal de onboarding

## Contexto

`useUser` (`apps/web/hooks/use-user.ts`) abre `UserOnboardingDialog` en dos casos distintos con la misma apariencia:

- Cuando `listUsers()` devuelve una lista vacía: la base aún no tiene usuario (modo usuario único).
- Cuando la llamada falla por cualquier motivo: la API está inalcanzable o devolvió un error.

El 15/10/2026 esto produjo un diagnóstico equivocado en producción: la API estaba caída (`sh: pnpm: not found` en el contenedor, health 503, `createUser` devolvía "Failed to fetch"), la web mostró la modal de onboarding y se asumió que la base de datos se había borrado, lo que llevó a restaurar un respaldo innecesario.

## Objetivo

Que la UI comunique cada estado con su mensaje real y evite acciones que no tienen salida:

- **API inalcanzable**: mostrar un aviso de conectividad con botón de reintentar. No pedir un nombre que no se podrá guardar.
- **Base sin usuario**: conservar la modal de onboarding actual.

## Alcance propuesto

1. Separar en `useUser` los estados "falta usuario" y "error de conexión" (p. ej. `needsOnboarding` vs `apiError`).
2. En `UserOnboardingDialog` (`apps/web/components/dialogs/user-onboarding-dialog.tsx`):
   - Si hay error de conexión, mostrar mensaje explicativo y un botón "Reintentar" que dispare de nuevo `loadUser`.
   - Si no hay usuario, conservar el formulario actual.
3. Opcional: usar `GET /api/v1/health` (`apps/api/src/modules/health/...`) como señal rápida de conectividad antes de intentar guardar.

## Cambios implicados

### Frontend

- `apps/web/hooks/use-user.ts`: distinguir error de red/HTTP de lista vacía.
- `apps/web/components/dialogs/user-onboarding-dialog.tsx`: renderizar el modo de error de conexión.
- `apps/web/lib/api.ts` (opcional): tipar o detectar errores de red de forma explícita.

### Backend

- Ninguno: el endpoint de health ya existe.

## Fuera de alcance (por ahora)

- Notificaciones automáticas o monitoreo del backend.
- Cambios en el modo usuario único o persistencia del usuario en el cliente.

## Notas

- Coherente con AGENTS.md: mobile-first y amigable. Un estudiante no puede distinguir "se borró mi usuario" de "la app está caída".
- Relacionado con el incidente del deploy 14-15/10/2026 (ver logs en `docs/deployment-azqrdbdohao29zeh80hqnxao-all-logs-2026-10-15-13-35-53.txt` y `docs/deployment-4xbfytsn68ojpmnfr14vgnqp-all-logs-2026-10-15-13-34-09.txt`).
