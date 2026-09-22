# Arquitectura técnica

## 1. Visión

```text
Browser
   |
   v
Next.js
   |
   | REST
   v
NestJS Modular Monolith
   |
   +--> PostgreSQL / Prisma
   |
   +--> AIProvider -> DeepSeek
   |
   +--> ObjectStorage (futuro)
```

No hay Redis, workers, microservicios ni IAM en el MVP.

## 2. Clean Architecture

Cada módulo de negocio puede seguir:

```text
module/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   └── repositories/
├── application/
│   ├── ports/
│   ├── use-cases/
│   └── dto/
├── infrastructure/
│   ├── persistence/
│   └── external/
└── presentation/
    └── controllers/
```

Dependencias:

```text
presentation -> application -> domain
infrastructure -> application/domain
domain -> nada externo
```

## 3. Persistencia

Prisma solo puede ser utilizado desde infrastructure.
Los repositorios se expresan como interfaces en application/domain y se implementan con Prisma.

## 4. IA

```text
QuizController
    |
    v
GenerateQuizUseCase
    |
    v
QuestionGenerator port
    |
    v
AIProvider
    |
    +--> DeepSeekAdapter
    +--> FutureProviderAdapter
```

Los prompts, mapeos de respuestas y detalles HTTP del proveedor pertenecen a infrastructure.

## 5. IA configurable

El proveedor no debe estar hardcodeado en casos de uso.

Conceptualmente:

```ts
interface AIProvider {
  analyzeMaterial(input: AnalyzeMaterialInput): Promise<MaterialAnalysis>;
  generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]>;
  explainAnswer(input: ExplainAnswerInput): Promise<Explanation>;
  generateHint(input: GenerateHintInput): Promise<Hint>;
}
```

La selección del proveedor debe pasar por una factoría/registry.

Para el MVP puede existir solo `deepseek`.
La abstracción debe permitir posteriormente `openai`, `anthropic`, `ollama` u otro proveedor compatible sin tocar los casos de uso.

## 6. Storage

```ts
interface ObjectStorage {
  upload(input: UploadInput): Promise<StoredObject>;
  delete(key: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  getSignedUrl(key: string): Promise<string>;
}
```

El port `ObjectStorage` vive en `application` (`modules/storage/application/ports/`) y la implementación S3 (`S3ObjectStorage`) en `infrastructure/`. Los casos de uso dependen del port, nunca de la implementación.

Implementación local (dev): **MinIO** como proveedor S3-compatible, levantado con el docker compose y configurado por variables de entorno (`S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`).

Implementación futura (producción): S3-compatible para Backblaze B2 o Contabo Object Storage, configurable solo por variables de entorno sin modificar los casos de uso.

## 7. Autenticación futura

Crear una frontera:

```ts
interface IdentityProvider {
  validateToken(token: string): Promise<Identity>;
  getIdentity(token: string): Promise<Identity>;
}
```

En MVP puede existir un `DevelopmentIdentityProvider` extremadamente simple o un contexto de usuario local controlado. No implementar Authentico todavía.

Cuando llegue la etapa 2:
`AuthenticoIdentityProvider` será el adapter.

## 8. Procesamiento

MVP:
```text
HTTP request
 -> Use Case
 -> process
 -> persist
 -> response
```

Futuro:
```text
HTTP request
 -> create operation
 -> queue
 -> worker
 -> Use Case
 -> persist
```

Los casos de uso no deben depender de que exista o no una cola.
