# Requerimiento: contador de materiales real en las tarjetas de materia

## Contexto

Las tarjetas del Inicio muestran `{subject.materials} materiales` y una barra de progreso (`apps/web/components/ui/subject-card.tsx:59`), pero el contador **sale siempre 0**. No es un caso raro: es el comportamiento por defecto en cada carga.

La causa está en `decorateSubject`, que fija el valor a cero al construir el objeto de la materia:

```ts
// apps/web/lib/subjects.ts:19-30
export function decorateSubject(subject: ApiSubject, index: number): Subject {
  const color = colorOptions[index % colorOptions.length];
  return {
    ...subject,
    progress: 0,
    materials: 0,
    ...
  };
}
```

`materials` no es un campo de `ApiSubject`: es decoration del cliente, y arranca en cero. El único escritor es `setSubjectMaterials` (`apps/web/hooks/use-subjects.ts:161-165`), y su único llamador es `refreshSubjectMaterialCount` (`apps/web/hooks/use-materials.ts:60-72`). Ese método se invoca desde exactamente dos sitios, ambos como efecto secundario de actuar en la vista de Materiales:

- `apps/web/app/page.tsx:89-90` — después de procesar o borrar un material.
- `apps/web/app/page.tsx:141` — después de crear un material desde el diálogo.

Consecuencias, todas igual de molestas:

1. Al entrar en Inicio no se calcula nada, así que el contador está en 0 aunque haya materiales.
2. Solo se corrige **por accidente**, y solo si el usuario crea un material desde la vista de Materiales.
3. Se queda desactualizado en cualquier otro cambio: borrar un material, borrar un tema (que arrastra sus materiales en cascada) o borrar la materia.
4. El cálculo es un N+1: `refreshSubjectMaterialCount` pide los temas y luego `listMaterials` por cada tema (`use-materials.ts:62-68`). Hacerlo para todas las materias al cargar sería `(1 + temas) × materias` peticiones.

## Objetivo

Que el número de materiales de cada tarjeta sea correcto desde la primera pintada, sin que el usuario tenga que crear un material para que aparezca.

## Cambios implicados

### Backend
- Exponer el conteo desde la API. La opción recomendada es añadir `materialsCount` al DTO de materia y calcularlo en la misma consulta de `GET /subjects` (`_count` de Prisma sobre la relación materia → temas → materiales): una consulta extra, sin N+1, y el dato es correcto por construcción en vez de por reacción.
- Alternativa más pesada: un endpoint de conteo por materia, que deja el N+1 en el cliente y solo mejora si además se acepta un endpoint agregado para todas las materias.

### Frontend
- `lib/subjects.ts:19-30`: `decorateSubject` deja de fijar `materials: 0` y consume el `materialsCount` que llega en la materia.
- `lib/api.ts`: el tipo `ApiSubject` gana el campo.
- `hooks/use-subjects.ts`: `setSubjectMaterials` se mantiene para el refresco optimista tras crear o borrar, pero deja de ser el único camino al valor.
- Revisar si `refreshSubjectMaterialCount` sigue haciendo falta: con el conteo en la respuesta de materias, se puede eliminar junto con el N+1.

## Fuera de alcance (por ahora)

- La barra de `progress`, que sigue en 0 por el mismo motivo `decorateSubject` y que es otro requerimiento: `docs/ToDo/exponer-progreso-basico.md`.
- Desglose por tema dentro de la tarjeta.
- Paginación o conteo aproximado cuando la materia tiene miles de materiales.

## Notas

- Coherente con AGENTS.md: el dato se pide donde se calcula y no se replica en el cliente. Hoy el cliente es la única fuente del número, y por eso hay que empujarlo hacia atrás con cada acción.
- El mismo `decorateSubject` que inventía el cero del contador inventa el cero del progreso: son el mismo defecto de diseño (decoración en el cliente en lugar de dato), lo que sugiere tratar ambos a la vez aunque cada uno se implemente por separado.
- Depende de la API: hasta que `GET /subjects` devuelva el conteo, cualquier arreglo del cliente es parche. La ruta limpia es backend primero.
- Relacionado: `docs/ToDo/exponer-progreso-basico.md` (la otra mitad de la tarjeta).
