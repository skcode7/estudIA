---
name: session-history
description: Registra un resumen de la sesión en docs/history. Usar cuando el usuario pida guardar o resumir lo trabajado en la sesión, p. ej. "graba un resumen de la sesión en docs/history", "registra lo hecho hoy en history" o similar.
---

# Registro de resumen de sesión en docs/history

Cuando el usuario solicite guardar un resumen de la sesión en `docs/history`, seguir este flujo.

## Flujo

1. **Revisar la carpeta** `docs/history/` para ver archivos existentes y respetar su formato y numeración.
2. **Construir la fecha** en formato `YYYY-MM-DD` (día local del sistema).
3. **Crear** el archivo `docs/history/YYYY-MM-DD-tema.md`, donde `tema` es un slug corto en kebab-case que describe la sesión (p. ej. `crud-materias`).
4. Escribir el resumen usando esta estructura de Markdown:

```markdown
# Sesión: <título breve>

**Fecha:** YYYY-MM-DD
**Estado:** Completado

## Contexto

<qué motivó la sesión, estado inicial>

## Cambios realizados

### Backend
<archivos por capa: ports, use cases, repository, controller, DTOs, module, tests>

### Frontend
<archivos: api client, páginas/componentes>

### Documentación
<archivos docs/* y docs/ToDo/*>

## Validaciones

- <tsc/lint/tests ejecutados y resultado>

## Commits

| Hash | Descripción |

## Pendientes / próximos pasos

- <ítems abiertos si los hay>
```

## Reglas

- **Idioma**: los resúmenes en este repo se escriben en español, igual que el resto de la documentación.
- **Ser conciso**: enumerar archivos por capa sin duplicar detalles de implementación.
- **Commits**: incluir tabla de commits de la sesión con hash abreviado (7 chars) y mensaje, obtenidos con `git log`.
- **Solo si es explícito**: ejecutar esta tarea únicamente cuando el usuario lo pida; no crear resúmenes de sesión automáticamente al terminar una tarea.
- Tras crear el archivo, indicar al usuario la ruta creada.