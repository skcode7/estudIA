# Requerimiento: comportamiento accesible y consistente de los diálogos modales

## Contexto

Todos los diálogos de la app usan el componente compartido `apps/web/components/dialogs/dialog.tsx:14-34` (`aria-modal="true"`, `role="dialog"`, tarjeta centrada). En la app corriendo se comprobaron estas carencias:

- **Escape no cierra**: con el diálogo de "Nueva materia" abierto, pulsar `Escape` lo deja abierto.
- **El foco se escapa**: tras 7 pulsaciones de `Tab` desde el diálogo, el foco aterrizó en el botón "+ Nueva materia" de la página de fondo. No hay trampa de foco ni `inert`/`aria-hidden` en el contenido de atrás.
- **No hay retorno de foco**: al cerrar, el foco no vuelve al botón que abrió el diálogo.
- **Clic en el fondo no cierra**: clic en la esquina del overlay (5,5) no produce nada; solo cierran la `×` y "Cancelar".
- **Scroll de fondo no bloqueado**: `getComputedStyle(document.body).overflow` sigue siendo `visible` con el modal abierto. El menú móvil ya resuelve esto (`apps/web/components/layout/mobile-menu.tsx:30-38`) y también escucha `Escape` (líneas 21-28); el modal no siguió ese patrón.
- **Sin nombre accesible**: el `<h2>` del título no está asociado con `aria-labelledby`, y no hay `aria-describedby`.
- **Onboarding**: `apps/web/components/dialogs/user-onboarding-dialog.tsx:24-30` usa `role="dialog"` + `aria-modal` pero tampoco atrapa el foco. Es bloqueante por diseño (cubre la pantalla), así que el escape de foco es más grave.
- **Menú móvil**: escapa con `Escape` y bloquea scroll, pero no atrapa el foco y expone dos controles con el mismo nombre accesible "Cerrar menú" (overlay y `×`, `mobile-menu.tsx:65-88`).

## Objetivo

Que cualquier modal se pueda operar solo con teclado, sin que el foco viaje a la página de fondo, y que se cierre con las convenciones esperadas (`Escape`, fondo, `×`, Cancelar), devolviendo el foco a quien lo abrió.

## Alcance propuesto

### Frontend

- Extraer un hook `useModalBehavior` (o equivalente) reutilizable por `Dialog`, `UserOnboardingDialog` y `MobileMenu`:
  - trampa de foco (ciclo entre el primer y el último elemento focusable),
  - foco inicial en el primer campo accionable o en el título,
  - cierre con `Escape` (excepto en el onboarding si se decide que no es descartable, y aun así debe atrapar el foco),
  - bloqueo del scroll del `body` mientras está abierto,
  - restauración del foco al elemento que abrió el modal.
- En `Dialog`, aceptar `closeOnBackdrop` (por defecto `true`) y asociar el título con `aria-labelledby`; agregar `aria-describedby` cuando el contenido lo requiera.
- En `MobileMenu`, dejar un único control de cierre con nombre accesible; el overlay puede ser `aria-hidden` y no focusable, o rotularse distinto ("Cerrar menú desde el fondo").
- Añadir pruebas de comportamiento del hook/componente (foco inicial, `Escape`, retorno de foco) con Vitest + Testing Library si se incorpora esta última; si no, dejar la verificación manual documentada.

### Backend

- Ninguno.

## Fuera de alcance (por ahora)

- Rediseñar el contenido o la estética de cada diálogo.
- Animaciones de entrada/salida.
- Revisar el estado de error/red del onboarding: eso vive en `docs/ToDo/modal-onboarding-vs-api-caida.md`.

## Notas

- Evidencia recogida con `playwright-cli` sobre la app local: `Escape` deja el diálogo abierto, clic en el overlay no lo cierra y `body.overflow` sigue en `visible`; el foco se escapó al botón "+ Nueva materia" tras 7 `Tab`.
- El antecedente directo es el menú móvil: ya implementa `Escape` y bloqueo de scroll; conviene generalizar ese comportamiento en lugar de duplicarlo.
- Coherente con AGENTS.md: accesibilidad y mobile-first; el usuario de móvil no tiene tecla `Escape`, así que el cierre por fondo y el foco correcto importan especialmente.
