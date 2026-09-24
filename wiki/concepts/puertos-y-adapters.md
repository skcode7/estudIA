---
title: Puertos y adaptadores
type: concept
responsibility: El patrón que repite cada módulo de la API: casos de uso contra clases abstractas, implementaciones concretas solo en infrastructure, y el cableado en el módulo Nest.
sources:
  - apps/api/src/modules/materials/application/ports/material.repository.ts
  - apps/api/src/modules/quizzes/application/ports/quiz.repository.ts
  - apps/api/src/modules/storage/application/ports/object-storage.ts
  - apps/api/src/modules/ai/application/ports/ai-provider.ts
  - apps/api/src/modules/materials/materials.module.ts
  - apps/api/src/modules/ai/ai.module.ts
synced: 36ec39f
related:
  - ../components/ia.md
  - ../components/materiales.md
---

# Puertos y adaptadores

El mismo patrón aparece en todos los módulos de la API — materias, temas, materiales, quizzes,
usuarios, storage, IA — y quien lo aprende una vez lo reconoce en el resto. Es la regla de
AGENTS.md ("los casos de uso dependen de interfaces, la implementación vive en infrastructure")
puesta en código.

## La forma

```
application/ports/material.repository.ts   abstract class MaterialRepository { … }
application/use-cases/*.use-case.ts        constructor(private readonly repository: MaterialRepository)
infrastructure/prisma-material.repository  @Injectable() class PrismaMaterialRepository implements MaterialRepository
materials.module.ts                        { provide: MaterialRepository, useClass: PrismaMaterialRepository }
```

Un caso de uso recibe el puerto por constructor y no puede ver al adaptador; el adaptador
implementa el puerto y no conoce a los casos de uso; el único sitio donde ambos se encuentran es la
lista de `providers` del módulo (`apps/api/src/modules/materials/materials.module.ts:39`), que es
donde hay que mirar para saber qué implementación corre hoy.

## Por qué clase abstracta y no `interface`

TypeScript borra las `interface` en compilación y no se pueden inyectar; una clase abstracta es a
la vez el tipo y el token de DI. Por eso `MaterialRepository`
(`apps/api/src/modules/materials/application/ports/material.repository.ts:35`), `QuizRepository`
(`apps/api/src/modules/quizzes/application/ports/quiz.repository.ts:78`), `ObjectStorage`
(`apps/api/src/modules/storage/application/ports/object-storage.ts:12`) y `AIProvider`
(`apps/api/src/modules/ai/application/ports/ai-provider.ts:97`) son `abstract class`. Los tests los
sustituyen por mocks del mismo tipo.

## Lo que el patrón compra

- **Cambiar de proveedor sin tocar el dominio**: es lo que permite meter otro servicio de IA o
  pasar de MinIO a Backblaze B2 solo moviendo el binding (ver
  [Storage S3-compatible](../decisions/storage-s3-minio.md)).
- **Puertos que el dominio necesita aunque el proveedor cambie**: `ObjectStorage` declara
  `getSignedUrl` (`apps/api/src/modules/storage/application/ports/object-storage.ts:16`) porque el
  dominio se imagina URLs firmadas, aunque hoy nada las use.
- **Tests de casos de uso sin base de datos ni red**: los `.spec.ts` mockean el puerto.

## Los dos bordes que sí se salen

Nada es perfecto y hay dos excepciones visibles. Los DTOs de la capa `presentation` son
class-validator y se conocen en el controller, que es donde se traducen a tipos del dominio
(`apps/api/src/modules/materials/presentation/controllers/materials.controller.ts:156`). Y la
configuración no pasa por puertos: se inyecta como token propio de cada módulo (ver
[Configuración por entorno](./configuracion-por-entorno.md)).

El patrón tiene un coste: cada puerto duplica su tipo de registro (un `MaterialRecord` con los
mismos campos que el modelo Prisma) y cada adaptador reimplementa el mapeo. Es el precio de que el
dominio no importe Prisma, que es la regla que AGENTS.md no negocia.
