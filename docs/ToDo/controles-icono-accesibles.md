# Requerimiento: botones de solo icono con nombre accesible y área táctil suficiente

## Contexto

En "Mis materias" cada tarjeta tiene dos botones de solo icono: editar y eliminar (`apps/web/components/ui/subject-card.tsx:32-47`). Ambos miden **32×32 px** (`size-8`) y su único contenido es el glifo `✎` / `🗑`.

- El atributo `title="Editar"` / `title="Eliminar"` no define el nombre accesible cuando hay contenido de texto: el árbol de accesibilidad expone los botones como **"✎"** y **"🗑"** (verificado en el snapshot de Playwright). Un lector de pantalla no anuncia qué hacen ni sobre qué materia.
- 32×32 px queda por debajo del mínimo recomendado de 44×44 px para objetivos táctiles en móvil (medido en el DOM a 390 px de ancho).
- La misma acción en Materiales sí usa etiqueta textual ("✎ Editar" / "✕ Eliminar"), así que el patrón no es consistente dentro de la app.
- El resto de controles de icono sí tiene nombre: el botón de menú (`aria-label="Abrir menú"`), el cierre de diálogos (`aria-label="Cerrar"`) y el de notificaciones (`aria-label="Notificaciones"`, aunque no tenga acción; ver `docs/ToDo/acciones-sin-destino.md`).

## Objetivo

Que todo control interactivo de solo icono tenga un nombre accesible que incluya la acción y el contexto, y una superficie táctil de al menos 44×44 px.

## Alcance propuesto

### Frontend

- En `SubjectCard`, añadir `aria-label` con contexto: `Editar materia ${subject.name}` y `Eliminar materia ${subject.name}` (o `aria-labelledby` combinando la acción y el nombre de la materia).
- Subir el tamaño a `size-11` (44 px) manteniendo el icono pequeño dentro, o ampliar el hit area con padding. Verificar que las dos acciones sigan entrando en la esquina de la tarjeta en móvil.
- Revisar todos los elementos interactivos pequeños (`size-8`, `size-9`, `size-10`) y aplicar la misma regla; considerar mostrar el texto "Editar"/"Eliminar" en `sm:` y dejar solo el icono en pantallas menores.
- Aprovechar el cambio para unificar el estilo de las acciones destructivas (Materiales usa texto rojo sin borde; Materias usa emoji) si no se aborda en el ToDo de iconografía.

### Backend

- Ninguno.

## Fuera de alcance (por ahora)

- Cambiar el sistema de iconos de la app (ver `docs/ToDo/sistema-iconos-inconsistente.md`).
- Reordenar las acciones dentro de la tarjeta.

## Notas

- Evidencia: snapshot de accesibilidad con nombres "✎" y "🗑"; medición de `getBoundingClientRect()` = 32×32 en los cuatro botones de las dos tarjetas.
- Coherente con AGENTS.md: accesibilidad y mobile-first; una papelera sin etiqueta es ambigua incluso para usuarios sin lector de pantalla.
