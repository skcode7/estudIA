# Requerimiento: acciones sin destino y navegación a secciones no disponibles

## Contexto

Auditoría de la app local (`http://localhost:3000`, 2026-10-23) con `playwright-cli`, en escritorio (1440×900) y móvil (390×844 y 320×700). Hay controles que parecen accionables y no hacen nada, o que llevan a una pantalla vacía sin aviso:

- **Notificaciones**: `apps/web/components/views/home-view.tsx:39-45` renderiza un `<button aria-label="Notificaciones">` con el glifo `♧` y **sin `onClick`**. No hay campana ni panel; el botón no produce ningún cambio.
- **Progreso e Insignias**: `apps/web/lib/navigation.ts:1-9` los incluye en la navegación principal y `apps/web/app/page.tsx:102` cae en `PlaceholderView` ("Esta sección estará disponible próximamente"). Se puede navegar a una sección inexistente sin ninguna señal previa en el menú.
- **Tarjetas de materia en Inicio**: `SubjectCard` se pinta en Home sin `onEdit` ni `onDelete` (`home-view.tsx:119`), y el componente no envuelve la tarjeta en un enlace ni en un botón (`apps/web/components/ui/subject-card.tsx:13-22`). Tocar una materia en Inicio no abre materiales, quiz ni detalle, aunque la misma tarjeta en "Mis materias" sí tiene acciones.
- **Hero "Reto de hoy"**: `home-view.tsx:51-80` es un bloque que instruye "Selecciona una materia y agrega el material que quieres estudiar" pero no tiene ningún CTA; la única forma de actuar es salir del bloque.
- **Historial de quizzes**: los 19 intentos listados hoy son botones `disabled` (`apps/web/components/views/quiz-history-panel.tsx:48`) y parecen una lista rota. Está cubierto por `docs/ToDo/persistir-quiz-en-curso.md`; no se repite aquí.

## Objetivo

Que ningún control visible prometa una acción que no existe, y que las secciones no implementadas no sean alcanzables como si funcionaran.

## Alcance propuesto

### Frontend

- Quitar el botón de Notificaciones del header mientras no exista la feature (AGENTS.md: no implementar infraestructura sin necesidad real). Si se prefiere dejarlo visible, mostrarlo `disabled` con `aria-disabled` y un `title` que explique que aún no está disponible, sin hover de acción.
- Marcar Progreso e Insignias como "Pronto" en la navegación (badge + `aria-disabled` + no navegar) o retirarlos del menú hasta que existan. Es preferible retirarlos del MVP si no hay fecha.
- Hacer las tarjetas de materia de Inicio navegables a Materiales con la materia preseleccionada, reutilizando `onNavigate` que ya existe en `AppShell`/`page.tsx`, o quitar cualquier pista visual de que son interactivas.
- Añadir un CTA al hero ("+ Nueva materia" o "Agregar material") o convertirlo en contenido puramente informativo y quitar la instrucción de acción.
- En el historial de quizzes, mientras `persistir-quiz-en-curso.md` no esté implementado, al menos distinguir visualmente que "Sin responder" no es una fila rota (texto auxiliar "Aún no disponible"), sin prometer la acción.

### Backend

- Ninguno. Notificaciones, progreso e insignias quedan fuera del MVP.

## Fuera de alcance (por ahora)

- Implementar notificaciones, progreso o insignias.
- Habilitar "Continuar" en el historial de quizzes (ver `docs/ToDo/persistir-quiz-en-curso.md`).
- Rutas Next.js por vista.

## Notas

- Cómo se detectó: clic en cada ítem de la navegación; inspección de los `onClick` del código; conteo del historial en el DOM (`19` botones, los `19` con `disabled`).
- Coherente con AGENTS.md: mobile-first y no prometer secciones que no existen. El usuario percibe "app rota" cuando toca una campana y no pasa nada.
- Relacionado con `docs/ToDo/modal-onboarding-vs-api-caida.md` (estados de carga/error) y con el ya resuelto `docs/ToDo/tarjetas-materia-datos-reales.md` (las tarjetas de materia ahora traen color/icono, contador y progreso reales desde la API).
