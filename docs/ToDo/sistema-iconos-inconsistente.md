# Requerimiento: sistema de iconos consistente y con significado estable

## Contexto

La interfaz usa caracteres Unicode y emojis sueltos como iconos, sin un componente común:

- Navegación principal (`apps/web/lib/navigation.ts:1-9`): `⌂` Inicio, `▤` Mis materias, `📄` Materiales, `📝` Evaluaciones, `?` Quiz, `▥` Progreso, `♜` Insignias.
- Notificaciones: `♧` (`apps/web/components/views/home-view.tsx:44`), que es un palo de carta, no una campana.
- Avatares de materia (`apps/web/lib/subjects.ts:12-17`): `√`, `⚗`, `⌂`, `▤`, asignados en ciclo por índice.
- Estados vacíos: `▤` para "sin materias" en varias vistas, `🔍` para "sin resultados", `?` para Quiz, `📝` para Evaluaciones, `✦` en `PlaceholderView`.
- Materiales: `📷` en la tarjeta y `✓` en el badge "Listo".

Problemas observados:

1. **El mismo glifo significa cosas distintas**: `⌂` es "Inicio" en la nav y también el avatar naranja de una materia; `▤` es "Mis materias" y también el avatar violeta y el icono de estados vacíos; `?` es "Quiz" y también el icono de "Listo para estudiar".
2. **Iconos que no representan la acción**: `♧` (notificaciones), `♜` (insignias, una torre de ajedrez), `▥` (progreso), `▤` (materias) son glifos de fuentes de símbolos, no iconos de interfaz.
3. **Estilos mezclados**: emojis a color junto a símbolos monocromos, con tamaños y pesos que dependen de la fuente del sistema operativo. En algunos entornos los emojis pueden no renderizarse (cajas), y el layout reserva el hueco igual.
4. **Tamaños inconsistentes**: `text-lg` dentro de `size-5` en la nav, `text-xl` en avatares `size-12`, `text-2xl` en el botón de menú.

## Objetivo

Que cada icono tenga un significado único y estable, se renderice igual en cualquier plataforma y tenga un tamaño coherente.

## Alcance propuesto

### Frontend

- Elegir una fuente de iconos: `lucide-react` (coherente con shadcn/ui, ya nombrado en AGENTS.md) o un módulo local `components/ui/icon.tsx` con SVGs inline si se prefiere no añadir dependencia. Decisión explícita en el PR.
- Crear un mapa de iconos por concepto (`home`, `subjects`, `materials`, `evaluations`, `quiz`, `progress`, `badges`, `bell`, `edit`, `delete`, `camera`, `check`) y sustituir los literales en `navigation.ts`, `home-view.tsx`, `subject-card.tsx`, `mobile-menu.tsx`, `placeholder-view.tsx`, `state-panels.tsx` y las vistas que pasan `icon=` a `EmptyPanel`.
- Definir un tamaño base (p. ej. 20 px en nav, 24 px en avatares) y una regla de `aria-hidden` para iconos decorativos; los iconos dentro de botones sin texto deben llevar `aria-label` en el botón (ver `docs/ToDo/controles-icono-accesibles.md`).
- Mantener los emojis solo donde sean contenido intencional (por ejemplo el robot del hero o la mascota), no como iconos funcionales.

### Backend

- Ninguno. Los iconos de materia pasan a ser datos reales cuando se implemente `docs/ToDo/tarjetas-materia-datos-reales.md`; este ToDo solo define cómo se renderizan.

## Fuera de alcance (por ahora)

- Rediseñar la identidad visual, colores o tipografía.
- Cambiar los iconos de la tarjeta de material más allá de unificarlos con el mapa.
- Implementar el sistema de insignias.

## Notas

- La auditoría se hizo sobre los códigos de carácter y su uso, no sobre el renderizado del navegador headless (ese entorno no tiene fuentes de emoji y muestra cajas; no es un fallo de la app).
- Coordinar con `docs/ToDo/tarjetas-materia-datos-reales.md`: el avatar de materia dejará de ser cíclico y vendrá de la API, pero seguirá necesitando un set de iconos coherente.
- Coherente con AGENTS.md: preferir soluciones maduras y mantener el MVP simple; un mapa central evita que cada vista invente su glifo.
