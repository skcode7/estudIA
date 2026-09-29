# Sesión: Auto-procesado de materiales y título inferido por IA

**Fecha:** 2026-09-28
**Estado:** Completado

## Contexto

Dos peticiones del usuario, la segunda nacida al cerrar la primera. La primera, un ajuste sencillo:
el procesamiento solo se disparaba desde el botón «Procesar» de la lista, así que cada material
nuevo esperaba una segunda acción manual. La segunda: al procesar una foto, el título guardado salía
a veces como el nombre del archivo (`IMG-20240315-WA0037.jpg`).

Antes de tocar código se evaluó la viabilidad de que la IA dedujera el título, midiendo en vez de
suponer: se renderizó una imagen de apuntes con `sharp` y se preguntó cuatro veces. El resultado fue
3 títulos buenos y 1 `null`, con el contenido transcrito **perfecto** —incluida la línea «1. La
Fotosíntesis» del propio apunte—, lo que descartó la hipótesis de que faltara capacidad del modelo y
apuntó a las instrucciones: la regla del prompt decía «vacío si el material ya tiene uno claro» y el
formato declaraba el campo opcional, así que había una puerta de salida que el modelo tomaba a veces.

## Cambios realizados

### Backend
- `apps/api/src/infrastructure/ai/deepseek/deepseek.prompts.ts` — la regla de `suggestedTitle` pasa a
  exigir que infiera el título siempre, usando el encabezado visible si la imagen lo tiene, y prohíbe
  copiar el nombre del archivo. Se quitó el «opcional» del formato declarado. Es el cambio que
  resuelve el síntoma; no hubo que tocar dominio, casos de uso, schemas ni Prisma.

### Frontend
- `apps/web/hooks/use-materials.ts` — deja de ser solo el dueño del diálogo y pasa a serlo también del
  procesamiento en vuelo (`processingIds`) y de la señal de recarga (`reloadSignal`,
  `reloadMaterials`). `startProcessing` envuelve `processMaterial` y traga el error a propósito: el
  fallo habitual ya llega como material `FAILED` y lo muestra la lista, y swallowar aquí evita un
  rechazo sin manejar en un `void`.
- `apps/web/app/page.tsx` — `onCreated` encadena el procesamiento tras crear. El contador
  `materialsReloadSignal`, que era estado suelto de la página, se elimina en favor del del hook.
- `apps/web/components/views/materials-view.tsx` — acepta `processingIds` y lo suma a `isProcessing`,
  de modo que un material en curso muestra «Procesando…» deshabilitado en vez de un «Procesar»
  pulsable que duplicaría el trabajo. El botón sigue disponible en `PENDING` y `FAILED`. Subtítulo
  actualizado: ya no instruye a procesar a mano algo que es automático.
- `apps/web/components/dialogs/material-edit-dialog.tsx` — el aviso existente menciona que reprocesar
  devuelve el título a la IA, que es la contrapartida de que la IA lo deduzca siempre.

### Documentación
- Cuatro ToDos nuevos: `docs/ToDo/roles-tutor-alumno.md`, `selector-nivel-quiz.md`,
  `contador-materiales-tarjetas.md`, `listado-quizzes-con-resultado.md`.
- `docs/ToDo/exponer-progreso-basico.md` — ampliado con la decisión del porcentaje de la tarjeta como
  promedio simple de los `score` de los quizzes, descartando `masteryScore`.
- Wiki (`wikipoke-ingest`): `flows/procesamiento-de-material.md` y `components/web.md` reescritos en
  su núcleo, `components/ia.md` con la regla general sobre prompts, `architecture.md` y
  `components/vistas-de-catalogo.md` re-apuntadas, más `index.md`, `log.md` y el checkpoint.
- `docs/history/2026-09-28-auto-procesado-y-titulo-inferido.md` — este resumen.

## Validaciones

- `pnpm typecheck`: exit 0. `pnpm lint`: exit 0. `pnpm test`: 107 tests en 28 archivos, todos pasan.
- Medición del arreglo contra la API local: `suggestedTitle` vacío pasó de **1 de 4** llamadas a
  **0 de 8**.
- Verificación manual del ciclo completo contra los servicios locales: crear devuelve
  `PENDING`/`questionCount: 0`, procesar devuelve `COMPLETED` con 3 preguntas en ~8 s.
- `wikipoke check`: drift 0, lint OK en las 18 páginas. La cobertura sin cambios: 6 de 128 archivos
  sin reclamar, los mismos placeholders de `packages/*` de antes.
- No se añadió test nuevo: `deepseek.mapper.spec.ts` ya cubría el parseo de `suggestedTitle` incluido
  el caso vacío, y la intermitencia viene del modelo, no del Zod.

## Commits

| Hash | Descripción |
|------|-------------|
| `4fe2f8a` | feat(web): procesa el material al confirmar el popup |
| `171e86b` | fix(api): la IA infiere el título en vez de dejarlo vacío |
| `e02b72e` | feat(web): avisa que reprocesar vuelve a proponer el título |
| `6931a91` | docs(todo): roles, nivel de quiz, contador de tarjetas e historial |
| `c46b97d` | docs(wiki): reconcilia el auto-procesado y el título deducido |

## Pendientes / próximos pasos

- **Reiniciar `pnpm dev`**: el watcher del API no recompilaba desde las 10:53, así que el prompt
  corregido todavía no está activo en el entorno local. Se detectó porque `dist/` seguía con la
  versión vieja; a media sesión se creyó que el arreglo no funcionaba cuando en realidad era el
  servidor sirviendo código antiguo.
- Los cuatro ToDos nuevos. `roles-tutor-alumno.md` depende de materializar la frontera
  `IdentityProvider` (`frontera-identity-provider.md`).
- `selector-nivel-quiz.md` se solapa con `generacion-inteligente-quiz.md`, que ya propone un selector
  de tamaño; hay que decidir si uno absorbe al otro.
- `contador-materiales-tarjetas.md` y el `progress: 0` de la misma tarjeta salen del mismo
  `decorateSubject`: decoration en el cliente donde debería haber dato. Ambos convergen en exponer el
  conteo desde `GET /subjects`.
- El wiki sigue con 6 archivos sin reclamar, todos placeholders vacíos de `packages/*` más
  `pnpm-workspace.yaml`. No es deuda de esta sesión.
