# Requerimiento: soportar múltiples imágenes por material en el backend

## Contexto

Hoy el diálogo de materiales (`apps/web/components/dialogs/material-dialog.tsx`) permite capturar varias fotos de un mismo tema (páginas sucesivas) y acumula el texto extraído de cada una en el campo **Texto**, sin tocar materia/tema/título. Ese comportamiento es frontend puro y está descrito en el cambio "A".

El cuello de botella es el backend: `uploadMaterial` del cliente arma un `FormData` con **un solo** archivo y lo manda a `POST /materials/upload` (`apps/web/lib/api.ts:160-180`):

```ts
form.set("file", input.file);
```

Y el controlador lo espera así (`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:100-121`):

```ts
@Post("upload")
@UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE } }))
uploadFile(
  @UploadedFile() file: Express.Multer.File | undefined,
  @Body() dto: UploadMaterialDto
): Promise<MaterialDto> {
  if (!file) {
    throw new BadRequestException("El archivo es obligatorio en el campo \"file\".");
  }
  return this.createFileMaterialUseCase.execute({
    topicId: dto.topicId,
    title: dto.title?.trim() || file.originalname,
    originalName: file.originalname,
    contentType: file.mimetype,
    body: file.buffer,
    content: dto.content?.trim() || undefined,
    hasEmbeddedFigures: dto.hasEmbeddedFigures ?? false,
    questionMode: dto.questionMode
  })...
}
```

El `CreateFileMaterialUseCase` guarda esa única imagen como la imagen del material. Esa imagen luego se usa para recortar figuras de las preguntas (regiones con `sharp`, `MaterialImage`, endpoint `GET /materials/:id/images/:imageId`), así que solo la **primera** página queda disponible para preguntas con figura. Las fotos 2, 3… aportan únicamente su texto, no se persisten.

El módulo de evaluaciones ya resuelve exactamente este problema con múltiples imágenes (`apps/api/src/modules/evaluations/presentation/controllers/evaluations.controller.ts:60-88`): usa `FilesInterceptor("files", MAX_FILES, …)`, `@UploadedFiles() files: Express.Multer.File[]` y mapea con `toUploadImages`/`toAnalyzeImages`. Sirve de patrón directo.

## Objetivo

Que un material pueda guardar **todas** las fotos capturadas (no solo la primera), de modo que las figuras de cualquier página estén disponibles para generar preguntas con imagen, y que el cliente envíe el arreglo completo en lugar de solo `pages[0]`.

## Alcance propuesto

- Cambiar el endpoint `POST /materials/upload` para aceptar múltiples archivos (campo `files`, como evaluaciones), validando al menos uno y un tope `MAX_FILES`.
- Persistir cada imagen como su propio `MaterialImage` asociado al material, manteniendo el orden de captura.
- El `content` combinado (texto de todas las páginas) sigue viajando en el body, igual que hoy.
- El cliente (`apps/web/lib/api.ts:uploadMaterial` y `material-dialog.tsx`) envía `pages` completo en lugar de `selectedFile`.

## Cambios implicados

### Backend
- `materials.controller.ts:100-121`: reemplazar `FileInterceptor("file")` / `@UploadedFile()` por `FilesInterceptor("files", MAX_FILES, …)` / `@UploadedFiles()` (patrón idéntico a `evaluations.controller.ts:60-88`).
- `UploadMaterialDto` (`dto/materials.dto.ts`): quitar la dependencia de un único archivo obligatorio y validar el arreglo `files`.
- `CreateFileMaterialUseCase` (y su puerto/DTO de entrada): aceptar `files: ImageInput[]` y delegar la creación de los `MaterialImage` en el repositorio, preservando el orden.
- `MaterialImageRepository`: creación en lote ordenada (ya existe la entidad `MaterialImage` y su `@@index([materialId])`, `prisma/schema.prisma`).
- Definir `MAX_FILES` para materiales coherente con el de evaluaciones.

### Frontend
- `apps/web/lib/api.ts:160-180`: `uploadMaterial` recibe `files: File[]` y los agrega como `files` (no `file`).
- `apps/web/components/dialogs/material-dialog.tsx`: enviar `pages` completo; el campo `file: selectedFile` deja de existir.

## Fuera de alcance (por ahora)

- Re-procesar/extraer texto de nuevo en el backend a partir de las imágenes adicionales (el texto ya se une en el cliente).
- UI de miniaturas/editar/borrar imágenes individuales del material (hoy el diálogo solo lista las páginas como solo lectura y ofrece "Empezar de nuevo").
- Preguntas que mezclen figuras de páginas distintas; primero hay que decidir si `imageId` de la pregunta apunta a cualquier `MaterialImage` del material (ya es el caso) y cómo se presenta al estudiante.

## Notas

- Reutilizar el patrón de `evaluations` evita reinventar la validación de múltiples archivos e imagen; mantiene coherencia de arquitectura (Clean Architecture: el caso de uso no conoce Multer, solo recibe `ImageInput[]`).
- El `hasEmbeddedFigures` que hoy envía el cliente (OR de todas las páginas, `material-dialog.tsx`) sigue teniendo sentido para decidir si se intenta extraer regiones.
- No rompe `POST /materials` (texto sin archivo), que es el otro camino de creación.
- `docs/ToDo/indicador-imagenes-en-materiales.md` ya está implementado: el listado expone `imageCount` (conteo real agregado por el backend, no `hasEmbeddedFigures`). Si el material pasa a tener N imágenes como caso normal, la insignia de imágenes pasa de indicador secundario a principal sin cambios en el contrato. Ver también `procesamiento-documentos-ia.md`.
