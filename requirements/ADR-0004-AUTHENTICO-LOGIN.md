# ADR-0004 — Login con Authentico en etapa 2

## Estado
Aceptado (2026-11-01). Suplanta la "no integración" de ADR-0003 para el
login; roles/guards/multiusuario siguen diferidos.

## Contexto
estudIA validó el producto con un usuario local sin identidad (ADR-0003). La
frontera `IdentityProvider` estaba documentada pero no materializada. El SDK
oficial `@ed_open/authentico-sdk@0.1.0` (registry público de GitLab) ya expone
`login` y está validado contra el ambiente de desarrollo.

## Decisión
- Integrar Authentico únicamente para **login** mediante un adapter
  (`AuthenticoAuthProvider`) que implementa el port `AuthProvider` en
  `modules/auth/`.
- El `SessionId` es una credencial opaca emitida por Authentico: se guarda en el
  cliente (cookie de 14 días si "Recuérdame", `sessionStorage` si no) y se envía
  como header `X-Session-Id` en cada llamada.
- No se crean contraseñas ni sesiones propias: la identidad la provee Authentico.
- El `User` local se reutiliza como perfil de la app (find-or-create por login).
- Roles, guards, multiusuario y validación de sesión (GetSessionInfo) se diferencian
  al plan de roles; el SDK 0.1.0 no los expone.

## Consecuencias
- Endpoints siguen públicos (sin guard) hasta el plan de roles.
- `IdentityProvider.validateToken` (ARCHITECTURE §7) se materializa cuando el SDK
  exponga `GetSessionInfo`.
- Auto-registro queda bloqueado hasta que el SDK exponga `create_user` (issue
  abierto en ed_open/authentico-sdk).