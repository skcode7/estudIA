---
name: todo-requirement
description: Agrega un requerimiento pendiente a docs/ToDo con formato estandarizado. Usar cuando el usuario pida registrar un requerimiento, mejora o feature futura en el ToDo, p. ej. "agrega en el ToDo", "ponlo en docs/ToDo", "guarda este requerimiento para después".
---

# Registro de requerimiento en docs/ToDo

Cuando el usuario solicite agregar un requerimiento pendiente a `docs/ToDo`, seguir este flujo.

## Flujo

1. **Revisar** `docs/ToDo/` para ver archivos existentes y respetar su formato y estilo.
2. **Crear** el archivo `docs/ToDo/<slug>.md`, donde `<slug>` es un nombre corto en kebab-case que describe el requerimiento (p. ej. `paginacion-materias`).
3. Escribir el requerimiento usando esta estructura de Markdown:

```markdown
# Requerimiento: <nombre corto del requerimiento>

## Contexto

<estado actual, qué hace hoy el sistema y por qué esto deja de ser suficiente>

## Objetivo

<qué debe lograr el requerimiento, en términos de comportamiento de usuario>

## Alcance propuesto

- <ítems puntuales del alcance>

## Cambios implicados

### Backend
- <archivos/capas a modificar: modelo, DTOs, puerto, repository, use case, controller, tests>

### Frontend
- <archivos/capas a modificar: api client, páginas/componentes, estado>

## Fuera de alcance (por ahora)

- <lo que explícitamente NO se implementa en este requerimiento>

## Notas

- <decisiones, coherencia con AGENTS.md, referencias a requerimientos relacionados>
```

## Reglas

- **Contexto concreto**: citar archivos reales del repo (rutas) y comportamiento actual para que el requerimiento sea accionable sin reconstruir el contexto.
- **No implementar**: esta skill solo documenta; no escribir código asociado al requerimiento.
- **Coherencia**: mencionar AGENTS.md cuando aplique (p. ej. validar inputs, no sobreingenierizar, fronteras arquitectónicas).
- **Idioma**: español, igual que el resto de la documentación del repo.
- Tras crear el archivo, informar al usuario de la ruta creada.