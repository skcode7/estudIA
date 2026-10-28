# Requerimiento: gamificación hardcodeada y header de estadísticas en móvil

## Contexto

La app presenta métricas de progreso que no existen en el backend:

- Home: `Racha 5 días`, `XP 1,240` y `Diamantes 230` son literales en `apps/web/components/views/home-view.tsx:35-38`.
- Tarjeta de usuario (sidebar y menú móvil): `Nivel 8`, barra fija al `77%` y `1,240 / 1,600 XP` son literales en `apps/web/components/layout/nav-shared.tsx:97-103`.
- El hero promete "Progreso real" (`home-view.tsx:65`) mientras esas cifras son decorativas. Las tarjetas de materia muestran `0%` y `0 materiales` también inventados (cubierto por `docs/ToDo/tarjetas-materia-datos-reales.md`).
- Las mismas cifras de XP aparecen en tres sitios (Home, sidebar, menú móvil) y no provienen de ninguna fuente única.

Además, el bloque de estadísticas se rompe en pantallas estrechas:

- A 320 px de ancho, el contenedor mide 288 px y sus hijos se reparten `[82, 82, 82, 24]`: el botón de notificaciones, definido como `size-12` (48 px), se comprime a **24 px** porque no tiene `shrink-0`, y el glifo queda pegado a "Diamantes 230". El objetivo táctil deja de ser usable.
- En el hero, la fila de características usa separadores `•` como `<span>` independientes (`home-view.tsx:60-66`); a 320 px el primer `•` queda huérfano al final de la línea ("Materiales propios •").
- No hay desbordamiento horizontal de la página (medido: `scrollWidth === clientWidth === 320`), pero sí apretujamiento interno.

## Objetivo

No presentar métricas ficticias como si fueran progreso real, y que el header de estadísticas siga siendo legible y usable desde 320 px.

## Alcance propuesto

### Frontend

- Decidir el alcance del MVP: si no hay rastreo de racha/XP/diamantes/nivel, **ocultar** el bloque de estadísticas y la tarjeta de nivel hasta que existan (AGENTS.md: no implementar infraestructura sin necesidad real), y retirar la promesa "Progreso real" del hero. Si se mantienen, obtenerlas de una fuente real (ver `docs/ToDo/tarjetas-materia-datos-reales.md` para el progreso por materia) y centralizar el dato en un hook/contexto.
- Si el bloque se conserva: añadir `shrink-0` al botón de notificaciones, permitir que la fila envuelva o pase a dos filas por debajo de `sm`, mover la campana fuera del grupo de estadísticas (es una acción, no una métrica) y ajustar paddings/tamaños de fuente en `<360 px`.
- Corregir los separadores del hero: incluirlos dentro de cada ítem (`<span>Materiales propios</span><span aria-hidden>·</span>` con `flex` por ítem) o usar una lista con `::before`, para que nunca quede un separador solo al final de una línea.
- Unificar la tarjeta de usuario para que sidebar y menú móvil consuman el mismo componente ya compartido (`nav-shared.tsx`) sin duplicar cifras.

### Backend

- Ninguno en este ToDo. Si se elige mostrar datos reales, el endpoint de progreso se define en `docs/ToDo/tarjetas-materia-datos-reales.md`.

## Fuera de alcance (por ahora)

- Implementar un sistema de XP, niveles, rachas, diamantes o insignias.
- La pantalla de Progreso (hoy placeholder; ver `docs/ToDo/acciones-sin-destino.md`).
- Cambiar el sistema de iconos (emoji de las estadísticas incluidos; ver `docs/ToDo/sistema-iconos-inconsistente.md`).

## Notas

- La medición se hizo con `playwright-cli` a 320×700: anchos de los hijos del bloque de estadísticas `[82, 82, 82, 24]` y sin overflow de página. A 390×844 el bloque entra sin recortes.
- Los emojis de las estadísticas se ven como cajas en el navegador headless usado para la auditoría por falta de fuentes de emoji en el entorno; **no** se reporta como fallo de la app. El hallazgo es de datos y de layout, no de renderizado de fuentes.
- Relacionado con `docs/ToDo/tarjetas-materia-datos-reales.md`, que ya unifica contador/progreso/color de materia y deja fuera "Insignias y Repaso".
