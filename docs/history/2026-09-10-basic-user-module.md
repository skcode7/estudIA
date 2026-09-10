# Sesión: Módulo básico de usuario (nombre para el MVP)

**Fecha:** 2026-09-10
**Estado:** Completado

## Contexto

El nombre del usuario en el home ("Alex") estaba hardcodeado. Se necesitaba una tabla de usuarios para persistir el nombre del estudiante que usa el sistema, aunque la integración con el IAM (Authentico) no sea parte del MVP. La tabla se diseñó con un solo registro en el MVP pero preparada para multiusuario futuro.

## Cambios realizados

### Backend (apps/api)

- **Prisma schema** (`prisma/schema.prisma`): nuevo modelo `User` (id, name, timestamps).
- **Migración** (`20260910171635_add_user_model`): crea tabla `User` en PostgreSQL.
- **Port `UserRepository`** (`users/application/ports/user.repository.ts`): interfaces `UserRecord`, `CreateUserInput`, `abstract UserRepository` (findAll, create).
- **Use cases** (`users/application/use-cases/`):
  - `list-users.use-case.ts` — devuelve todos los usuarios.
  - `create-user.use-case.ts` — crea un usuario con nombre.
- **Tests** (2 archivos, 3 tests nuevos): specs de ambos use cases con mock del repository.
- **Implementación Prisma** (`users/infrastructure/prisma-user.repository.ts`): findAll (ordenado por createdAt) y create.
- **DTO** (`users/presentation/dto/users.dto.ts`): `CreateUserDto` (name, class-validator), `UserDto` (con decoradores Swagger).
- **Controller** (`users/presentation/controllers/users.controller.ts`): `GET /users`, `POST /users`.
- **Module** (`users/users.module.ts`): registrado en `app.module.ts`.

### Frontend (apps/web)

- **API client** (`lib/api.ts`): `ApiUser`, `listUsers()`, `createUser()`.
- **`app/page.tsx`**:
  - Nuevo estado: `user`, `isUserLoading`, `isUserModalOpen`, `userName`, `isSavingUser`, `userError`.
  - `useEffect` dedicado: llama `listUsers()` al montar; si está vacío, abre el modal.
  - `saveUser()`: POST y setea el usuario.
  - Modal bloqueante fullscreen con spinner de carga y formulario "¿Cómo te llamas?" + botón "Comenzar".
  - "Alex" reemplazado por `user?.name` en sidebar card (línea 294) y saludo "¡Hola, {userName}!" en HomeView.
  - `HomeView` recibe nuevo prop `userName`.

### Documentación

- `architecture/DATA-MODEL.md`: agregada entidad User con nota sobre multiusuario/Authentico futuro.

## Validaciones

- `tsc --noEmit` sin errores en `@estudia/api` y `@estudia/web`.
- ESLint sin errores en ambos paquetes.
- 13/13 tests de vitest en `@estudia/api` (6 archivos).
- Smoke test de la API: `GET /api/v1/users` → `[]`, `POST /api/v1/users` → usuario creado, `GET /api/v1/users` → `[usuario]`.

## Commits

| Hash | Descripción |
|---|---|
| `5956878` | feat(backend): add User model to Prisma schema with migration |
| `4e297e3` | feat(backend): add users module with list and create endpoints |
| `0928bf0` | feat(frontend): add user onboarding modal and dynamic greeting |
| `20100b8` | docs: add User entity to data model documentation |
| `b26dbad` | docs: add session history for basic user module |

## Pendientes / próximos pasos

- Integración con Authentico (ADR-0003): definir qué información de usuario se requiere además del nombre.
- Multiusuario: asociar userId a Subject, Quiz, etc. cuando exista más de un registro.
- Editar nombre de usuario (no requerido actualmente).
