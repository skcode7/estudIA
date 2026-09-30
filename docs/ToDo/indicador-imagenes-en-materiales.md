# Requerimiento: marcar en el listado si un material tiene imágenes extraídas

## Contexto

En el listado de Materiales, cada fila termina su línea de título con una única insignia, la de estado (`Pendiente` / `Procesando…` / `Listo` / `Error`):

```tsx
// apps/web/components/views/materials-view.tsx:274-280
<div className="flex flex-wrap items-center gap-2">
  <span aria-hidden="true" className="text-xl">{materialIcon(material.type)}</span>
  <h3 className="truncate text-sm font-bold">{material.title}</h3>
  <MaterialStatusBadge status={material.processingStatus} />
</div>
```

El componente de la insignia es pequeño y está aislado, con un único consumidor:

```tsx
// apps/web/components/ui/material-status-badge.tsx:3-8
const STATUS_STYLES: Record<MaterialProcessingStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-slate-100 text-slate-600" },
  PROCESSING: { label: "Procesando…", className: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Listo", className: "bg-emerald-100 text-emerald-700" },
  FAILED: { label: "Error", className: "bg-rose-100 text-rose-700" }
};
```

El problema: el listado **no dice nada** de las imágenes extraídas. Y el dato que el cliente ya recibe no sirve para saberlo:

```ts
// apps/web/lib/api.ts:44
hasEmbeddedFigures: boolean;
```

`hasEmbeddedFigures` es una casilla que marca el usuario al subir el material (o que sugiere el borrador de análisis, `apps/web/components/dialogs/material-dialog.tsx:54`, `:136`, `:243`). Es una **intención declarada**, no un hecho: se pone a `true` y el extractor puede no encontrar nada, devolver figuras de más, o directamente estar desactivado porque no hay `OPENROUTER_API_KEY` y el adapter es el no-op (`apps/api/src/infrastructure/ai/noop.image-extractor.ts:11-19`). A la inversa también falla: si el usuario desmarca la casilla después de procesar, el material conserva sus imágenes en la base y el listado no lo refleja.

El hecho real vive en otra tabla, `MaterialImage` (`apps/api/prisma/schema.prisma:76-89`), y el listado no la consulta nunca: `MaterialDto` no tiene ningún campo de imagen (`apps/api/src/modules/materials/presentation/dto/materials.dto.ts:133-191`) y `toMaterialDto` no lo mapea (`materials.controller.ts:208-223`). Los metadatos de las figuras solo se piden dentro del diálogo de edición, al abrirlo:

```tsx
// apps/web/components/dialogs/material-edit-dialog.tsx:64
Promise.all([listMaterialQuestions(material.id), listMaterialImages(material.id)])
```

O sea: para saber que un material tiene figuras hay que abrirlo, y la pestaña "Imágenes" es la única fuente de la verdad.

## Objetivo

Que en el listado de Materiales, junto a la insignia de estado, se vea de un vistazo qué materiales tienen imágenes extraídas, sin abrir cada material.

## Alcance propuesto

- Exponer el número de imágenes por material en la respuesta de `GET /materials` (por ejemplo `imageCount`), de forma agregada y sin N+1.
- Renderizar una insignia de "imágenes" junto al estado en la fila del listado, coherente con el estilo del badge existente.

## Cambios implicados

### Backend
- `MaterialImageRepository` (`apps/api/src/modules/materials/application/ports/material-image.repository.ts`): añadir un `countByMaterials(materialIds: string[]): Promise<Map<string, number>>` con el mismo forma que el `countByMaterials` de preguntas (`ports/material-question.repository.ts:47`), implementado en `PrismaMaterialImageRepository` con un `groupBy` sobre `materialId`.
- `MaterialWithQuestionCount` (`ports/material-question.repository.ts:3-9`) y sus consumidores (`list-materials.use-case.ts:13-15`, `get-material.use-case.ts:13-18`, `update-material.use-case.ts:16-22`): el caso de uso de listado pasa a resolver también el conteo de imágenes. Conviene decidir si se renombra el tipo o se devuelve una estructura con ambos conteos, para no arrastrar un nombre que ya no describe lo que lleva.
- `MaterialDto` (`dto/materials.dto.ts:133-191`) y `toMaterialDto` (`controllers/materials.controller.ts:208-223`): nuevo campo `imageCount`.

### Frontend
- `lib/api.ts:37-50`: `ApiMaterial` gana `imageCount`.
- `apps/web/components/ui/material-status-badge.tsx`: el archivo puede crecer a un `material-badges.tsx` con `MaterialStatusBadge` y la nueva `MaterialImageBadge` (mismo patrón `Record<...>` de `STATUS_STYLES`), o la insignia de imágenes se define junto a su uso si solo la consume `materials-view.tsx`. Mantener el badge accesible: si es solo un icono, necesita texto accesible o `aria-label`, porque `aria-hidden` en un icono aislado no comunica nada.
- `apps/web/components/views/materials-view.tsx:279`: añadir la insignia de imágenes a la línea del título, mostrando el número cuando sea mayor que cero.

## Fuera de alcance (por ahora)

- Miniatura o carrusel de imágenes en la fila: obliga a traer binarios al listado.
- Cambiar `hasEmbeddedFigures` para que lo derive el extractor. Es un campo de entrada del usuario y se usa para decidir si se intenta extraer; su semántica es "el usuario dice que hay figuras", no "hay figuras". La insignia nueva debe leer el conteo real, no este booleano.
- Enlace directo a la pestaña de imágenes del diálogo de edición.
- Paginación del listado de materiales, que hoy carga todo el tema de una vez.

## Notas

- Coherente con AGENTS.md: el conteo se calcula en el backend, en la misma consulta que ya agrupa preguntas, y el cliente no inventa el dato. Es el mismo patrón que `questionCount` y que el `materialsCount` pendiente en `docs/ToDo/contador-materiales-tarjetas.md`.
- La insignia de imágenes y la de estado son datos distintos y complementarios: `COMPLETED` con `imageCount: 0` es un caso normal y no debe leerse como un fallo. `PROCESSING` todavía no tiene el conteo final, así que la insignia conviene aparecer solo con `imageCount > 0`.
- `docs/ToDo/procesamiento-documentos-ia.md` cambiará este panorama: cuando los PDF se procesen página a página, `MaterialImage` pasará a ser el camino normal y no el caso excepcional, y esta insignia pasa de "curiosidad" a indicador principal del material.
- Sin migraciones: `MaterialImage` ya tiene `@@index([materialId])` (`apps/api/prisma/schema.prisma:88`), así que el `groupBy` del listado no necesita índice nuevo.
