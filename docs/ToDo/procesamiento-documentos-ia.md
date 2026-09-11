# Requerimiento: procesamiento de documentos con IA (PDF/doc)

## Contexto

La integración de IA se enfoca en textos y fotos/imágenes, porque DeepSeek acepta imágenes JPEG/PNG/GIF/WebP como entrada multimodal. Hoy un material `FILE` cuyo archivo no sea una imagen (pdf, txt, doc/docx, etc.) no puede procesarse: `ProcessMaterialUseCase` lo marca `FAILED` con `processingError` de "tipo de archivo no soportado".

DeepSeek ofrece una API de archivos (`https://api-docs.deepseek.com/guides/files_api`) que permite subir documentos y referenciarlos por `file_id`, y el modelo puede extraer cada página como imagen para su análisis.

## Objetivo

Que cualquier material `FILE` (foto o documento) se pueda procesar con IA: el usuario sube un apunte en PDF o Word y el sistema extrae el texto/contenido, rellena los campos del material y genera preguntas igual que con fotos.

## Alcance propuesto

- Evaluar la integración con la DeepSeek Files API: subir el archivo, obtener `file_id`, y referenciarlo en las llamadas de visión/chat para extraer cada página como imagen.
- Alternativa: evaluar un proveedor/OCR distinto para documentos (p. ej. PDF multilengua, DOCX), manteniendo la frontera de `AIProvider`.
- Evaluar una configuración de proveedor por formato de archivo (p. ej. `AI_PROVIDER_DOCUMENT=...`) usando el mismo registry, sin tocar los casos de uso.

## Cambios implicados

### Backend
- `apps/api/src/infrastructure/ai/deepseek/` (`deepseek.client.ts`, `deepseek.prompts.ts`): subida de archivos, gestión de `file_id` y prompt de extracción por página.
- Posible ampliación del puerto `AIProvider` o un segundo adapter para documentos.
- `ProcessMaterialUseCase`: rama para documentos en lugar de marcar `FAILED`.

### Frontend
- Sin cambios esperados (el disparo es el mismo "IA mode").

## Fuera de alcance (por ahora)

- En la iteración actual de arquitectura IA solo se procesan imágenes.

## Notas

- Coherencia con AGENTS.md: no tocar controllers/use cases al cambiar de proveedor; la selección por formato debe vivir en el registry de infraestructura.
- Límites de la Files API (64 MiB por `file_id`, 48 MiB inline) a tener en cuenta.