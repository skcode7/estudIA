---
title: Armazón y primitivas de la interfaz
type: entity
responsibility: Dueño del esqueleto que rodea a todas las vistas —el armazón, las dos navegaciones, el diálogo base y las primitivas de estado y realimentación— y del vocabulario visual que comparte toda la app.
sources:
  - apps/web/components/layout/app-shell.tsx
  - apps/web/components/layout/sidebar.tsx
  - apps/web/components/layout/mobile-menu.tsx
  - apps/web/components/layout/nav-shared.tsx
  - apps/web/components/dialogs/dialog.tsx
  - apps/web/components/ui/state-panels.tsx
  - apps/web/components/ui/feedback.tsx
  - apps/web/components/ui/material-status-badge.tsx
  - apps/web/components/ui/icon.tsx
  - apps/web/components/layout/site-footer.tsx
  - apps/web/lib/icons.ts
  - apps/web/lib/navigation.ts
synced: 4b7f1f3
related:
  - ./web.md
  - ./vistas-de-catalogo.md
---

# Armazón y primitivas de la interfaz

Lo que hay alrededor de las vistas y por debajo de ellas: dónde vive el menú, cómo es un diálogo y
qué tres estados tiene cualquier lista de datos. Ninguna de estas piezas habla con la API; todas
reciben datos y funciones ya cerrados.

## Un armazón, dos navegaciones que comparten sus piezas

`AppShell` (`apps/web/components/layout/app-shell.tsx:10`) es la única pieza que decide la
estructura: fondo `#f8f7fc`, cabecera móvil, columna de contenido, las dos navegaciones y el footer. No conoce
las vistas —recibe `children`— y solo reenvía `activeView`, `onNavigate`, `openMaterialDialog` y
`userName`. Desde `6d3cfec` es una columna (`apps/web/components/layout/app-shell.tsx:24`) y no una
fila con hueco inferior: la cabecera del menú móvil va encima, y el `pb-24` que reservaba sitio para
la barra de abajo se fue con ella.

Las dos navegaciones son **la misma lista**, `navItems` (`apps/web/lib/navigation.ts:1`), ahora con
identificadores semánticos de icono en vez de glifos; `NavLinks` los resuelve mediante `Icon`
(`apps/web/components/layout/nav-shared.tsx:44`). Desde `6d3cfec` también **las mismas piezas**:
`Sidebar` (`apps/web/components/layout/sidebar.tsx:16`) y
`MobileMenu` (`apps/web/components/layout/mobile-menu.tsx:10`) componen `NavLinks`, `BrandLockup`
(`apps/web/components/layout/nav-shared.tsx:9`), `AddMaterialButton`
(`apps/web/components/layout/nav-shared.tsx:72`) y `UserCard`
(`apps/web/components/layout/nav-shared.tsx:91`). Lo único que cambia entre una y otra es el
envoltorio y el tamaño del logo, que entran por `className` y `textClassName`.

`nav-shared.tsx` nació en `6d3cfec` porque antes no existía: cada navegación repetía el markup de
las opciones, de la tarjeta de usuario y del botón de material. El menú móvil era una **barra
inferior** (`mobile-nav.tsx`, borrado en `6d3cfec`) que recortaba la lista con
`navItems.slice(0, 4)`: el móvil veía cuatro destinos y los otros tres solo existían en escritorio.
Eso hacía que el orden de `navItems` decidiera qué desaparecía del móvil y no solo dónde iba cada
cosa; hoy el panel muestra las siete igual que la barra lateral, y el orden de la constante vuelve a
ser solo una decisión de producto (los que aún no tienen pantalla —Progreso e Insignias— siguen al
final). `ba4dd59` movió Evaluaciones delante de Quiz.

Navegar cierra el panel (`apps/web/components/layout/mobile-menu.tsx:23`), y lo mismo hacen el fondo
y el botón de cierre (`apps/web/components/layout/mobile-menu.tsx:28`); Escape lo cierra
(`apps/web/components/layout/mobile-menu.tsx:72`) y el fondo deja de desplazarse mientras está
abierto (`apps/web/components/layout/mobile-menu.tsx:72`). Lo que **no** tiene —igual que el
`Dialog`— es foco atrapado.

Solo hay una acción global: **Agregar material**. En escritorio es un botón más de la barra lateral
(`apps/web/components/layout/sidebar.tsx:22`) y en móvil un ítem del panel
(`apps/web/components/layout/mobile-menu.tsx:28`), que además cierra el panel antes de abrirlo. Es
la misma función entrando por dos puertas, y las dos se desactivan por `lg`, así que nunca
coexisten.

`SiteFooter` se monta debajo del contenido compartido (`apps/web/components/layout/app-shell.tsx:42`)
y presenta la bandera de Ecuador junto a la atribución «Uicons by Flaticon» enlazada al sitio del
proveedor (`apps/web/components/layout/site-footer.tsx:5`).

## El diálogo base

`Dialog` (`apps/web/components/dialogs/dialog.tsx:5`) es un overlay sin portal de React, sin foco
atrapado y sin tecla Escape: solo un `role="dialog"` y un fondo que cubre la pantalla. Cerrar es
responsabilidad de quien lo usa, siempre con el mismo botón de cierre de la esquina; el glifo sale
del mapa UIcons compartido.

Tiene dos anchos, y esa es toda su API: `max-w-lg` por defecto y `max-w-2xl` con scroll propio
cuando `wide` está activo (`apps/web/components/dialogs/dialog.tsx:68`). El ancho grande existe
porque la pantalla de edición de material no cabe en el estrecho: sin él, las pestañas y la galería
quedan apretadas.

`DialogActions` (`apps/web/components/dialogs/dialog.tsx:68`) es la convención de cierre de los
diálogos con formulario: cancelar a la izquierda, confirmar a la derecha, el confirm siempre con
`type="submit"`. Aparece dentro de un `<form>`, no envuelve uno, para que cada diálogo decida
cuándo valida.

## Los tres estados de una lista

`state-panels.tsx` son los tres estados que toda vista con datos repite: cargando, error y vacío.
El vacío admite CTA opcional, que es lo que permite que «Sin materiales» ofrezca crear en vez de
mandar al usuario a otro sitio (`apps/web/components/ui/state-panels.tsx:42`).

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

`apps/web/lib/icons.ts:1` es el mapa de nombres semánticos a glifos UIcons; el componente
`Icon` (`apps/web/components/ui/icon.tsx:13`) los renderiza con `aria-hidden`. La web carga el
estilo regular-rounded en el layout raíz. La navegación usa iconos de 20 px y los avatares de
materia de 24 px; el único emoji que queda es la mochila de Inicio. La marca (cerebro + libro) es
una imagen (`/brand/estudia-mark.webp`), no un emoji: `BrandLockup` la pinta con `next/image` en un
badge lavanda junto al wordmark.

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
(`apps/web/components/ui/material-status-badge.tsx:4`) no lo usa para los estados buenos: el mapa de
los cuatro estados de procesamiento va de slate a ámbar, esmeralda y rosa. Es el mismo criterio que
hizo pasar las pestañas de la edición a un subrayado en lugar de un relleno.

La única primitiva que antes mostraba datos inventados —la tríada de racha, XP y diamantes de
Inicio— desapareció con las métricas de gamificación (`5525cd7`); hoy Inicio no pinta esas tarjetas,
así que ninguna primitiva de la interfaz inventa cifras: todo número viene de la API.
