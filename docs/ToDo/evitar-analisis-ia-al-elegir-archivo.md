# Requerimiento: no disparar el análisis de IA al elegir el archivo

## Contexto

El diálogo de material lanza `analyzeMaterialDraft` en cuanto se elige un archivo (`apps/web/components/dialogs/material-dialog.tsx`, `handleSelectFile` → `runExtraction`). Cada cambio de archivo cuesta una llamada a la IA que el usuario percibe como espera antes de poder editar los campos (`wiki/components/web.md`, `wiki/flows/procesamiento-de-material.md`).

Para texto pegado sí hay un botón "✨ Extraer con IA". Para archivo no hay equivalente: la extracción es automática e inevitable.

`POST /api/v1/materials/analyze` carga el catálogo y llama al modelo; un fallo es `503`. Cambiar de foto dos veces en el mismo diálogo son dos cobros y dos esperas, aunque el usuario aún no haya guardado nada.

## Objetivo

Que el análisis de un archivo sea una acción explícita (como en el texto), no un efecto secundario de elegir el fichero, para poder adjuntar la foto, ajustar materia/tema a mano y extraer solo cuando se quiera.

## Alcance propuesto

- Al elegir archivo: rellenar título por defecto (nombre del fichero) y dejar el resto editable, sin llamar a `/materials/analyze`.
- Botón "Extraer con IA" también en el flujo de archivo (reutilizar `runExtraction`).
- Mantener el retry que ya existe (`handleRetryExtraction`).

## Cambios implicados

### Backend
- Sin cambios (el endpoint de analyze se queda).

### Frontend
- `apps/web/components/dialogs/material-dialog.tsx`: quitar `runExtraction` de `handleSelectFile`; mostrar el botón de extraer cuando hay archivo.

## Fuera de alcance (por ahora)

- Debounce o cola: no hace falta si deja de ser automático.
- Procesamiento de PDF (`docs/ToDo/procesamiento-documentos-ia.md`).

## Notas

- Hallazgo del wiki: `wiki/components/web.md`, `wiki/flows/procesamiento-de-material.md`.
- Coherencia con AGENTS.md: no sobreingenierizar; es un cambio de UI que ahorra llamadas al modelo.
- El análisis sigue siendo on-demand y anterior a guardar, solo deja de ser implícito.
