# Índice del wiki

## architecture

- [Arquitectura de estudIA](./architecture.md) — El mapa del monolito modular: capas, puntos de entrada e infraestructura local, con lo que cada carpeta es dueña de hacer.

## flow

- [Procesamiento de un material de estudio](./flows/procesamiento-de-material.md) — Cómo un material pasa de foto o texto a material procesado con preguntas generadas, desde el diálogo de la web hasta los casos de uso de materiales.
- [Figuras embebidas en una foto de apuntes](./flows/figuras-embebidas.md) — Cómo una foto de apuntes con banderas, mapas o diagramas acaba con esas figuras recortadas, guardadas y referenciadas por preguntas de imagen.
- [Generar y resolver un quiz](./flows/generar-y-resolver-quiz.md) — Cómo se arma un quiz desde las preguntas ya generadas, cómo se resuelve y cómo se puntúa el intento, desde la vista Quiz hasta los casos de uso de quizzes.

## entity

- [Módulo de materiales](./components/materiales.md) — Dueño del Material y de todo lo que cuelga de él: su ciclo de procesamiento con IA, sus figuras extraídas y sus preguntas.
- [Módulo de quizzes](./components/quizzes.md) — Dueño del quiz como instantánea de preguntas, de los intentos y su corrección, y del progreso por tema que se acumula al corregir.
- [Módulo de IA y sus adaptadores](./components/ia.md) — Dueño de la frontera con los modelos: qué puertos exponen los casos de uso, qué proveedor responde a cada trabajo y cómo se valida lo que el modelo devuelve.
- [Capa de persistencia (Prisma)](./components/persistencia.md) — Dueño de la conexión a PostgreSQL y de cómo los repositorios Prisma traducen los puertos del dominio a tablas, con las convenciones de orden y reemplazo de las que depende la API.
- [La forma del CRUD de catálogo](./components/crud-de-catalogo.md) — Cómo están construidos los módulos de materias, temas y usuarios — un caso de uso por operación, validación en el DTO y bindings repetidos — y las asimetrías entre ellos.
- [Módulos de materias, temas y usuarios](./components/catalogo.md) — Dueños de la jerarquía de catálogo (materia → tema) y del registro mínimo de usuario, con las reglas de borrado que arrastran todo lo demás.
- [Aplicación web (Next.js)](./components/web.md) — Dueño de la interfaz: una sola página client-side que compone vistas y diálogos, sus hooks de estado y el cliente HTTP contra la API.

## concept

- [Puertos y adaptadores](./concepts/puertos-y-adapters.md) — El patrón que repite cada módulo de la API: casos de uso contra clases abstractas, implementaciones concretas solo en infrastructure, y el cableado en el módulo Nest.
- [Configuración por entorno](./concepts/configuracion-por-entorno.md) — Cómo llega la configuración a la API — qué se lee al arrancar, qué se lee al llamar y cómo se inyectan los números ajustables — y por qué `apps/api/.env` importa.

## decision

- [DeepSeek detrás de un puerto, con un modelo de visión aparte](./decisions/proveedor-ia.md) — Por qué la IA se usa siempre a través de AIProvider, por qué DeepSeek es el primer proveedor y por qué las figuras van a un segundo proveedor en OpenRouter.
- [Object Storage S3-compatible con MinIO en local](./decisions/storage-s3-minio.md) — Por qué los archivos de los materiales viven en un object storage S3-compatible y por qué el entorno local corre MinIO en vez de guardar binarios en disco o en Postgres.
- [Sin identidad en el MVP, con frontera para Authentico](./decisions/authentico.md) — Por qué el MVP no tiene login ni sesiones, qué es hoy "el usuario" y dónde entra Authentico cuando toque.

## Otros archivos

- [log.md](./log.md) — Registro narrativo de cada pase de ingestión.
- [CONVENTIONS.md](./CONVENTIONS.md) — El esquema del wiki: tipos de página, plantilla y reglas de escritura.
