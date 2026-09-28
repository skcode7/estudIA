# Requerimiento: dar contenido real a los paquetes compartidos del monorepo

## Contexto

El workspace declara tres paquetes en `packages/` que no contienen código útil y que nadie importa. Es una decisión que se lleva arrastrando desde la siembra del monorepo:

- `packages/types` — `src/index.ts` es literalmente `export {};` (una sola línea). Su `package.json` solo declara `types` y `exports` apuntando a ese archivo vacío.
- `packages/validation` — `src/index.ts` re-exporta `z` de Zod; el paquete existe para eso y nadie lo consume.
- `packages/config` — no tiene `src/` en absoluto; su `package.json` solo lleva `name`, `version` y `private`.

Los tres están declarados como dependencias de `apps/web` (`apps/web/package.json:15`) y `apps/web/package.json:16`, pero un grep de `@estudia/(types|validation|config)` en todo el repo solo encuentra esas mismas declaraciones y el lockfile: **cero imports reales**.

La consecuencia práctica está en `apps/web/lib/api.ts`, que declara a mano todo el contrato de la API (`ApiSubject`, `ApiTopic`, `ApiMaterial`, `ApiMaterialQuestion`, `ApiQuiz`, `ApiQuizQuestion`…) y lo mantiene en paralelo con los DTOs de NestJS. Cambiar un DTO obliga a recordar cambiar el archivo de la web, y nada lo detecta: es el mismo tipo de silencio que el cast `as` en `docs/ToDo/mapeo-explicito-enums-prisma.md`, pero del otro lado del contrato. El wiki lo registra en `wiki/components/web.md` como «los tipos del contrato están duplicados».

## Objetivo

Decidir qué pasa con `packages/*`: o se les da contenido real y la web deja de duplicar el contrato, o se borran y el workspace queda con menos ruido. Mantenerlos vacíos es la única opción que no conviene: prometen una fuente de verdad compartida que no existe.

## Alcance propuesto

Elegir **una** de las dos direcciones (no las dos):

**A. Compartir el contrato de lectura.** `packages/types` pasa a declarar los tipos de la API (los `Api*` de `lib/api.ts`, más los `Create*`/`Update*` de entrada). `apps/web/lib/api.ts` los importa y los re-exporta si hace falta. La API no los importa: sus puertos ya definen sus propios registros, y un paquete de tipos compartido no debe acoplarse a Prisma. Esto elimina la duplicación sin tocar la Clean Architecture.

**B. Borrar los paquetes.** Quitar `packages/types`, `packages/validation` y `packages/config`, y sus entradas de `apps/web/package.json` y de `pnpm-workspace.yaml`. Menos ruido, y la web sigue declarando sus tipos donde los usa.

Si se elige A, `packages/validation` (el re-export de `z`) es ya redundante: la web importa Zod directamente. Evaluar si se queda o se borra dentro de la misma decisión.

## Cambios implicados

### Backend
- Sin cambios en `A` (los puertos de `application/` siguen siendo la verdad del dominio).
- Sin cambios en `B`.

### Frontend
- `apps/web/lib/api.ts` — quitar las declaraciones manuales de `Api*` e importar de `@estudia/types` (opción A), o dejarlas como están (opción B).
- `apps/web/package.json` y `pnpm-workspace.yaml` — según la dirección elegida.
- `packages/types/src/index.ts` — el contenido real, si va por A.

## Fuera de alcance (por ahora)

- Generar los tipos desde el `schema.prisma` (acoplaría el contrato público a Prisma; y `@prisma/client` en el front es justo lo que el MVP no necesita).
- Migrar los DTOs de la API a Zod: es otro requerimiento con su propia decisión ya tomada (`docs/ToDo/migracion-zod-dtos.md`). Si algún día esa migración ocurre, la opción A se vuelve más valiosa todavía, porque el schema sería la fuente compartida.
- Compartir lógica de negocio o hooks entre front y back.

## Notas

- Coherencia con AGENTS.md: no sobreingenierizar el MVP y no implementar lo que no tiene necesidad real. Este requerimiento existe justamente para **dejar de mantener algo que no sirve**; no para añadir una capa de abstracción nueva.
- La duplicación actual no ha causado ningún bug: funciona hoy porque la web es la única consumidora. El costo es de mantenimiento, y crece con cada endpoint nuevo.
- Si se opta por A, conviene decidir si el paquete se llama `types` o algo más preciso como `contracts`: lo que comparte no son tipos, sino la forma de la API vista desde fuera.
- Hallazgo registrado en `wiki/components/web.md` y en el pase `wikipoke-ingest` del 2026-09-28.
