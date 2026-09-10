# Requerimiento: paginación server-side para listado de materias

## Contexto

Actualmente `GET /api/v1/subjects` devuelve todas las materias de una sola vez. El listado se filtra en el cliente (`apps/web/app/page.tsx`) mediante `useMemo` sobre `subjectsFilter`.

Para un solo usuario con pocas materias esto es suficiente, pero a medida que la cantidad de materias crezca, el listado completo puede volverse lento en carga y rendering.

## Objetivo

Implementar paginación server-side en `GET /subjects` para que el listado sea eficiente independientemente del número de registros.

## Alcance propuesto

- Agregar parámetros de query `page` y `limit` (o `offset`) al endpoint `GET /subjects`.
- Devolver metadatos de paginación: `total`, `page`, `limit`, `totalPages`.
- El frontend debe consumir paginación con scroll infinito o botón "Cargar más".
- Mantener el filtro fulltext como query param también server-side (`?q=...`).

## Cambios implicados

### Backend
- Modificar `findAll()` en `SubjectRepository` y `PrismaSubjectRepository` para aceptar parámetros de paginación y filtro.
- Modificar `ListSubjectsUseCase` para pasar los parámetros.
- Modificar el controller para leer query params (`@Query()`).
- Crear DTO de respuesta paginada (`PaginatedSubjectsDto`).
- Actualizar los tests de `ListSubjectsUseCase`.

### Frontend
- Modificar `listSubjects()` en `apps/web/lib/api.ts` para aceptar `page`, `limit`, `q`.
- Adaptar `SubjectsView` para paginación (scroll infinito o "Cargar más").
- Mantener el filtro fulltext, ahora delegando al backend.

## Fuera de alcance (por ahora)
- Búsqueda avanzada por campos adicionales (fecha, progreso).
- Ordenamiento configurable por el cliente (por ahora fijo por nombre).

## Notas
- Decidir un `limit` por defecto razonable (p. ej. 20 o 50).
- Coherencia con AGENTS.md: si la operación se vuelve lenta, diseñar primero la interfaz de aplicación y posteriormente introducir una cola/worker sin modificar el dominio.
- Este requerimiento se activa cuando el número de materias supere la capacidad cómoda de rendering en una sola carga.
