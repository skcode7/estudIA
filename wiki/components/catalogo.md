---
title: Módulos de materias, temas y usuarios
type: entity
responsibility: Dueños de la jerarquía de catálogo (materia → tema) y del registro mínimo de usuario, con las reglas de borrado que arrastran todo lo demás.
sources:
  - apps/api/src/modules/subjects/presentation/controllers/subjects.controller.ts
  - apps/api/src/modules/subjects/application/use-cases/delete-subject.use-case.ts
  - apps/api/src/modules/users/presentation/controllers/users.controller.ts
  - apps/api/src/modules/materials/application/use-cases/create-text-material.use-case.ts
  - apps/web/hooks/use-user.ts
  - apps/api/prisma/schema.prisma
synced: 36ec39f
related:
  - ../components/materiales.md
  - ../components/crud-de-catalogo.md
  - ../decisions/authentico.md
---

# Módulos de materias, temas y usuarios

Tres módulos pequeños con la misma forma (controller → casos de uso → puerto → repositorio Prisma)
que sostienen la jerarquía sobre la que vive todo lo demás: `Subject` → `Topic` → `Material`. Lo
que importa aquí no es el CRUD, que es el que uno espera, sino qué pasa al borrar y quién es
"el usuario". La forma concreta de esos módulos — un caso de uso por operación, validación en el
DTO, asimetrías entre los tres — está en
[La forma del CRUD de catálogo](./crud-de-catalogo.md).

## La jerarquía y su única regla

Un tema pertenece a una materia y un material pertenece a un tema; crear un material valida que su
tema exista y si no, `404`
(`apps/api/src/modules/materials/application/use-cases/create-text-material.use-case.ts:20`). No hay
materiales huérfanos ni jerarquía más profunda: dos niveles, a propósito.

Los controladores son CRUD plano de cinco rutas para materias y temas
(`apps/api/src/modules/subjects/presentation/controllers/subjects.controller.ts:11`) y dos para
usuarios (`apps/api/src/modules/users/presentation/controllers/users.controller.ts:15`). No hay
paginación (hay un requerimiento pendiente en `docs/ToDo/paginacion-materias.md`) ni filtros
server-side; el filtrado de la lista lo hace la web.

## Borrar una materia borra todo lo que cuelga

`DeleteSubjectUseCase` borra la fila y nada más
(`apps/api/src/modules/subjects/application/use-cases/delete-subject.use-case.ts:14`); el resto lo
hace la base de datos en cascada: temas (`apps/api/prisma/schema.prisma:47`), materiales
(`apps/api/prisma/schema.prisma:69`), preguntas, quizzes e intentos. Con dos consecuencias que el
código no señala:

- **El object storage no se entera.** Solo `DeleteMaterialUseCase` limpia objetos; al borrar una
  materia, sus fotos y figuras quedan en MinIO/S3 para siempre. Es la vía más fácil de acumular
  basura en el bucket.
- **No hay confirmación de lo que arrastra.** El diálogo de borrado de la web avisa de que se
  perderán los materiales, pero el número real no se consulta antes de borrar.

## El usuario es un nombre, y el primero manda

`User` (`apps/api/prisma/schema.prisma:197`) es solo `name` + fechas: sin contraseña, sin sesión,
sin rol. La web decide cuál es "el usuario" con una convención, no con una regla: carga la lista y
se queda con el primero (`apps/web/hooks/use-user.ts:21`); si la lista está vacía — o si la
consulta falla — abre el diálogo de onboarding para crearlo
(`apps/web/hooks/use-user.ts:24`).

Eso significa que en un despliegue con varios navegadores cualquiera que cree un usuario ve el
mismo perfil: el MVP es de un solo usuario y la API no lo impone en ninguna parte. La frontera
para poner aquí una identidad real está prevista y documentada en
[Authentico más tarde](../decisions/authentico.md).

## Lo que estos módulos dejan fuera

No hay borrado en bloque, ni archivado, ni nombres duplicados: `name` no tiene índice único, y
dos materias con el mismo nombre conviven sin más.
