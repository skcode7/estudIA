---
title: Armazón y primitivas de la interfaz
type: entity
responsibility: Dueño del esqueleto que rodea a todas las vistas —el armazón, las dos navegaciones, el diálogo base y las primitivas de estado y realimentación— y del vocabulario visual que comparte toda la app.
sources:
  - apps/web/components/layout/app-shell.tsx
  - apps/web/components/layout/sidebar.tsx
  - apps/web/components/layout/mobile-nav.tsx
  - apps/web/components/dialogs/dialog.tsx
  - apps/web/components/ui/state-panels.tsx
  - apps/web/components/ui/feedback.tsx
  - apps/web/components/ui/material-status-badge.tsx
  - apps/web/components/ui/stat.tsx
synced: 3fe7ee4
related:
  - ./web.md
  - ./vistas-de-catalogo.md
---

# Armazón y primitivas de la interfaz

Lo que hay alrededor de las vistas y por debajo de ellas: dónde vive el menú, cómo es un diálogo y
qué tres estados tiene cualquier lista de datos. Ninguna de estas piezas habla con la API; todas
reciben datos y funciones ya cerrados.

## Un armazón, dos navegaciones

`AppShell` (`apps/web/components/layout/app-shell.tsx:9`) es la única pieza que decide la
estructura: fondo `#f8f7fc`, columna de contenido y las dos navegaciones. No conoce las vistas —
recibe `children`— y solo reenvía `activeView`, `onNavigate` y `openMaterialDialog`.

La duplicación de navegación es deliberada y son **las dos misma lista**: `navItems`
(`apps/web/lib/navigation.ts:1`). `Sidebar` la usa entera; `MobileNav` corta a los cuatro
primeros con `navItems.slice(0, 4)` (`apps/web/components/layout/mobile-nav.tsx:17`). El orden de
esa constante es una decisión de producto, no un detalle: los destinos que se esconden en móvil
(Repaso, Progreso, Insignias) son los últimos porque son los que aún no tienen pantalla.

Solo hay una acción global: **Agregar material**. En escritorio es un botón más en la barra lateral
(`apps/web/components/layout/sidebar.tsx:51`) y en móvil es el FAB circular que sobresale de la barra
(`apps/web/components/layout/mobile-nav.tsx:30`). Es la misma función entrando por dos puertas, y
las dos se desactivan por `lg`, así que nunca coexisten.

## El diálogo base

`Dialog` (`apps/web/components/dialogs/dialog.tsx:3`) es un overlay sin portal de React, sin foco
atrapado y sin tecla Escape: solo un `role="dialog"` y un fondo que cubre la pantalla. Cerrar es
responsabilidad de quien lo usa, siempre con el mismo botón `×` de la esquina.

Tiene dos anchos, y esa es toda su API: `max-w-lg` por defecto y `max-w-2xl` con scroll propio
cuando `wide` está activo (`apps/web/components/dialogs/dialog.tsx:22`). El ancho grande existe
porque la pantalla de edición de material no cabe en el estrecho: sin él, las pestañas y la galería
quedan apretadas.

`DialogActions` (`apps/web/components/dialogs/dialog.tsx:42`) es la convención de cierre de los
diálogos con formulario: cancelar a la izquierda, confirmar a la derecha, el confirm siempre con
`type="submit"`. Aparece dentro de un `<form>`, no envuelve uno, para que cada diálogo decida
cuándo valida.

## Los tres estados de una lista

`state-panels.tsx` son los tres estados que toda vista con datos repite: cargando, error y vacío.
El vacío admite CTA opcional, que es lo que permite que «Sin materiales» ofrezca crear en vez de
mandar al usuario a otro sitio (`apps/web/components/ui/state-panels.tsx:44`).

**`ErrorPanel` tiene un defecto que conviene conocer**: su título es la cadena fija «No se pudieron
cargar tus materias» (`apps/web/components/ui/state-panels.tsx:16`), y el componente no recibe el
nombre de lo que falló. Materiales y Quiz lo reutilizan tal cual, así que un fallo al cargar
materiales o preguntas le dice al usuario que fallaron sus materias. No es un bug de lógica, es
un texto que quedó pegado al primer consumidor.

`feedback.tsx` son los tres mensajes dentro de un formulario, y son tres porque hay tres cosas
distintas que puede pasar: `Notice` para lo que se logró (`aria-live="polite"`, porque un aviso de
éxito no debe interrumpir), `FieldError` para lo que falló (`role="alert"`, que sí debe anunciarse) y
`WarningNote` para lo que va a pasar pero conviene que el usuario sepa antes de que pase. Los tres
se distinguen solo por el color —esmeralda, rosa, ámbar— y esa es la única diferencia que hace
falta: un mensaje que no es ni un éxito ni un error necesita su propio lugar, no metido a la fuerza
en uno de los otros dos.

## El vocabulario visual

No hay librería de componentes: son clases de Tailwind escritas a mano, y por eso hay que conocer
el vocabulario para no inventar un cuarto estilo. Se repite en cada archivo:

- **Primario**: `bg-[#6d4aff] px-4 text-white hover:bg-[#5b3fe0]`, siempre `min-h-11` para el área
  táctil. Es la acción principal de una pantalla y solo una.
- **Secundario**: `text-slate-600 hover:bg-slate-100`, sin relleno. Cancelar y acciones terciarias.
- **Tinte de acento**: `bg-[#f1eeff] text-[#6d4aff]`, el hover de la navegación activa. Sirve para
  marcar lo seleccionado sin parecer un botón.
- **Peligro**: `bg-rose-600` para confirmar borrados, `text-rose-600 hover:bg-rose-50` para el
  disparador.

El morado sólido es escaso a propósito, y por eso `MaterialStatusBadge`
(`apps/web/components/ui/material-status-badge.tsx:3`) no lo usa para los estados buenos: el mapa de
los cuatro estados de procesamiento va de slate a ámbar, esmeralda y rosa. Es el mismo criterio que
hizo pasar las pestañas de la edición a un subrayado en lugar de un relleno.

`Stat` (`apps/web/components/ui/stat.tsx:1`) es la única primitiva con datos inventados: la tríada
de racha, XP y diamantes de Inicio la recibe como `string` ya formateada, sin fuente en la API.
