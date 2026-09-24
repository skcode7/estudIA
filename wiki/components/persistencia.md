---
title: Capa de persistencia (Prisma)
type: entity
responsibility: Dueño de la conexión a PostgreSQL y de cómo los repositorios Prisma traducen los puertos del dominio a tablas, con las convenciones de orden y reemplazo de las que depende la API.
sources:
  - apps/api/src/infrastructure/database/prisma.module.ts
  - apps/api/src/infrastructure/database/prisma.service.ts
  - apps/api/src/modules/materials/infrastructure/prisma-material.repository.ts
  - apps/api/src/modules/materials/infrastructure/prisma-material-image.repository.ts
  - apps/api/src/modules/subjects/infrastructure/prisma-subject.repository.ts
  - apps/api/src/modules/topics/infrastructure/prisma-topic.repository.ts
  - apps/api/src/modules/users/infrastructure/prisma-user.repository.ts
synced: 36ec39f
related:
  - ../concepts/puertos-y-adapters.md
  - ../components/materiales.md
  - ../components/quizzes.md
---

# Capa de persistencia (Prisma)

Todo lo que toca la base de datos pasa por `PrismaService` y por un repositorio por puerto. Esta
página es la guía de esas dos piezas: dónde viven, qué convenciones cumplen y qué asume la API sin
decirlo.

## Una conexión, global

`PrismaService` es `PrismaClient` con ciclo de vida de Nest: conecta al iniciar el módulo y
desconecta al destruirlo (`apps/api/src/infrastructure/database/prisma.service.ts:5`). El módulo que
lo expone es `@Global()` (`apps/api/src/infrastructure/database/prisma.module.ts:5`), de modo que
cualquier repositorio lo inyecta sin importar nada más: no hay módulo de base de datos que
declarar en cada feature, ni segundo cliente.

## Un repositorio por puerto, dentro del módulo

Cada `abstract class` de `application/ports/` tiene su `Prisma*Repository` en el `infrastructure/`
del mismo módulo. Son deliberadamente planos: una llamada a Prisma por método, sin lógica de
negocio, y devolviendo los `*Record` del puerto, que son los modelos Prisma por otro nombre.

Cinco convenciones que la API da por supuestas y ningún tipo declara:

- **El orden es parte del contrato.** Materias y temas se listan por nombre
  (`apps/api/src/modules/subjects/infrastructure/prisma-subject.repository.ts:26`), materiales por
  fecha descendente (`apps/api/src/modules/materials/infrastructure/prisma-material.repository.ts:33`),
  usuarios por fecha ascendente (`apps/api/src/modules/users/infrastructure/prisma-user.repository.ts:11`)
  y figuras por su `order` (`apps/api/src/modules/materials/infrastructure/prisma-material-image.repository.ts:17`).
  Cambiar cualquiera de estos cambia lo que ve el usuario sin romper nada.
- **Las updates parciales solo escriben lo que llega.** `updateFields` y `update` extienden el
  `data` solo con los campos definidos (`apps/api/src/modules/materials/infrastructure/prisma-material.repository.ts:56`),
  de modo que un `PATCH` no puede vaciar un campo a `null` salvo que el puerto lo declare.
- **Reemplazar es borrar y crear en una transacción.** Tanto figuras
  (`apps/api/src/modules/materials/infrastructure/prisma-material-image.repository.ts:25`) como
  preguntas usan `deleteMany` + `create` dentro de `$transaction`: o se cambia todo el conjunto o no
  se cambia nada. Es lo que hace seguro reprocesar un material, y también lo que borra lo que
  referenciaban las filas antiguas (ver [Módulo de quizzes](../components/quizzes.md)).
- **El estado inicial se escribe, no se asume.** `create` fija `processingStatus: "PENDING"`
  aunque el esquema ya tenga el default (`apps/api/src/modules/materials/infrastructure/prisma-material.repository.ts:25`):
  el repositorio es la única verdad sobre cómo nace un material.
- **Borrar es borrar.** No hay borrado lógico ni columnas `deletedAt`: `delete` lanza el `DELETE`
  real (`apps/api/src/modules/materials/infrastructure/prisma-material.repository.ts:66`) y las
  cascadas del esquema hacen el resto. Los métodos devuelven `void` y descartan la fila que Prisma
  devuelve.

## Lo que Prisma decide por nosotros

Las cascadas y las referencias `SetNull` del `schema.prisma` son reglas de negocio escritas en el
esquema: borrar una materia arrastra sus temas y materiales, y las preguntas sobreviven a su
material. No están en ningún caso de uso y no hay tests que las vigilen; cuando se cambie una
relación, conviene leer [Módulos de materias, temas y usuarios](../components/catalogo.md) antes de
tocar el esquema.

Y una ausencia deliberada: no hay transacciones que crucen puertos. Cuando hace falta — corregir un
intento y recalcular el progreso — la transacción vive dentro de un repositorio
(`apps/api/src/modules/quizzes/infrastructure/prisma-quiz.repository.ts:125`), no en el caso de uso.
