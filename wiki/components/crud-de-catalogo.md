---
title: La forma del CRUD de catálogo
type: entity
responsibility: Cómo están construidos los módulos de materias, temas y usuarios — un caso de uso por operación, validación en el DTO y bindings repetidos — y las asimetrías entre ellos.
sources:
  - apps/api/src/modules/subjects/subjects.module.ts
  - apps/api/src/modules/subjects/application/ports/subject.repository.ts
  - apps/api/src/modules/subjects/application/use-cases/create-subject.use-case.ts
  - apps/api/src/modules/subjects/application/use-cases/get-subject.use-case.ts
  - apps/api/src/modules/subjects/application/use-cases/list-subjects.use-case.ts
  - apps/api/src/modules/subjects/application/use-cases/update-subject.use-case.ts
  - apps/api/src/modules/subjects/presentation/dto/subjects.dto.ts
  - apps/api/src/modules/topics/topics.module.ts
  - apps/api/src/modules/topics/application/ports/topic.repository.ts
  - apps/api/src/modules/topics/application/use-cases/create-topic.use-case.ts
  - apps/api/src/modules/topics/application/use-cases/get-topic.use-case.ts
  - apps/api/src/modules/topics/application/use-cases/list-topics.use-case.ts
  - apps/api/src/modules/topics/application/use-cases/update-topic.use-case.ts
  - apps/api/src/modules/topics/application/use-cases/delete-topic.use-case.ts
  - apps/api/src/modules/topics/presentation/controllers/topics.controller.ts
  - apps/api/src/modules/topics/presentation/dto/topics.dto.ts
  - apps/api/src/modules/users/users.module.ts
  - apps/api/src/modules/users/application/ports/user.repository.ts
  - apps/api/src/modules/users/application/use-cases/create-user.use-case.ts
  - apps/api/src/modules/users/application/use-cases/list-users.use-case.ts
  - apps/api/src/modules/users/presentation/dto/users.dto.ts
  - apps/api/src/main.ts
synced: 36ec39f
related:
  - ../components/catalogo.md
  - ../components/persistencia.md
  - ../concepts/puertos-y-adapters.md
---

# La forma del CRUD de catálogo

Los módulos de materias, temas y usuarios son el molde del proyecto: quien entiende uno entiende
los tres. Esta página describe esa forma — qué gana cada pieza y qué asimetrías hay que conocer —
sin repetir lo que las firmas ya dicen. Lo que significan esas entidades está en
[Módulos de materias, temas y usuarios](../components/catalogo.md).

## Un caso de uso por operación, incluso cuando sobra

Cada operación es una clase de diez líneas con un `execute`. Varios no hacen más que delegar en el
repositorio (`create-subject`, `list-subjects`), y eso no es accidental: el caso de uso es el punto
donde mañana entra una regla — unicidad de nombres, permisos, eventos — sin tocar controller ni
repositorio, y el punto donde hoy se hacen los tests. Los `.spec.ts` que cubren estos módulos
prueban casos de uso, no controllers.

Dos casos rompen la delegación y son los que llevan la lógica:

- **Antes de escribir, comprobar que existe.** `update` y `delete` hacen `findById` y devuelven
  `404` con mensaje en español antes de tocar nada
  (`apps/api/src/modules/subjects/application/use-cases/update-subject.use-case.ts:14`).
- **Antes de crear un hijo, comprobar al padre.** Crear un tema valida su materia
  (`apps/api/src/modules/topics/application/use-cases/create-topic.use-case.ts:14`); crear un
  material valida su tema. La integridad referencial se comprueba dos veces: aquí, para dar un
  error bueno, y en el esquema, por si acaso.

## Bindings repetidos, módulos herméticos

Ningún módulo importa a sus vecinos: `TopicsModule` necesita el repositorio de materias y lo
**declara otra vez** en sus propios providers (`apps/api/src/modules/topics/topics.module.ts:23`).
Lo mismo hacen `MaterialsModule` y `QuizzesModule`. La ventaja es que cada módulo se lee entero en
su archivo; el coste es que el binding `SubjectRepository → PrismaSubjectRepository` está escrito
en cuatro sitios, y cambiar la implementación implica buscarlos todos.

## La validación vive en el DTO

Los DTOs son class-validator documentado con Swagger: `name` de materia aguanta hasta 120
caracteres (`apps/api/src/modules/subjects/presentation/dto/subjects.dto.ts:8`), el de un tema 160
(`apps/api/src/modules/topics/presentation/dto/topics.dto.ts:12`) y las descripciones 500. El
`ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`
(`apps/api/src/main.ts:16`) completa el contrato: **un campo que el DTO no declara es un error**,
no un dato que se ignora, y por eso el DTO de respuesta también está decorado — sirve de contrato
para Swagger y para la web.

## Asimetrías entre los tres módulos

- **`PATCH` vacío.** En materias y temas un `PATCH` sin campos devuelve el registro sin cambios; en
  materiales es un `400` que exige al menos `title` o `content`
  (`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:142`). La regla
  no es uniforme y la web no lo nota porque siempre envía algo.
- **Usuarios es mitad de módulo.** Solo `GET /users` y `POST /users`: no hay update, no hay delete
  y el puerto no los declara (`apps/api/src/modules/users/application/ports/user.repository.ts:12`).
- **Filtros mínimos.** El único filtro del catálogo es `subjectId` al listar temas
  (`apps/api/src/modules/topics/presentation/controllers/topics.controller.ts:29`); materias no se
  filtran, no hay búsqueda y no hay paginación (requerimiento pendiente en
  `docs/ToDo/paginacion-materias.md`).
- **Sin índices únicos.** Nada impide dos materias con el mismo nombre; la validación es de
  longitud, no de unicidad.
