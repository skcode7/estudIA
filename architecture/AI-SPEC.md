# Especificación de arquitectura de IA

## Objetivo
DeepSeek es el proveedor inicial, pero no debe convertirse en una dependencia estructural de estudIA.

## Capas

```text
Domain
  |
Application
  |
AI Ports
  |
Provider Registry
  |
Infrastructure Adapters
  |
DeepSeek API
```

## Puerto principal

```ts
interface AIProvider {
  analyzeMaterial(input: AnalyzeMaterialInput): Promise<MaterialAnalysis>;
  generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]>;
  explainAnswer(input: ExplainAnswerInput): Promise<Explanation>;
  generateHint(input: GenerateHintInput): Promise<Hint>;
}
```

## Reglas
1. Controllers nunca llaman al SDK/API de IA.
2. Use cases nunca conocen DeepSeek.
3. Prompts específicos de DeepSeek viven en su adapter.
4. La respuesta externa se transforma a modelos internos.
5. Los errores del proveedor se convierten a errores de aplicación.
6. API keys solo en backend.
7. No enviar al proveedor información que no sea necesaria.
8. Registrar metadatos útiles sin almacenar secretos.
9. Validar la salida estructurada del modelo.
10. No confiar ciegamente en JSON producido por el modelo.

## Proveedor

```text
infrastructure/ai/
└── deepseek/
    ├── deepseek.provider.ts
    ├── deepseek.client.ts
    ├── deepseek.prompts.ts
    ├── deepseek.schemas.ts
    └── deepseek.mapper.ts
```

## Registry

```ts
interface AIProviderRegistry {
  get(provider: AIProviderId): AIProvider;
}
```

MVP:
```text
deepseek -> DeepSeekProvider
```

Futuro:
```text
deepseek
openai
anthropic
ollama
...
```

## Configuración
La configuración sensible debe permanecer en backend.
La configuración funcional puede evolucionar posteriormente a una pantalla administrativa.

El MVP puede usar variables de entorno:

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=
```

Más adelante, la configuración podrá persistirse en PostgreSQL y administrarse desde UI.

## Cambio de proveedor
Cambiar de proveedor debe requerir:
1. Implementar adapter.
2. Registrar adapter.
3. Configurar proveedor/modelo.
4. Ejecutar suite de pruebas.

No modificar:
- controllers
- entidades
- casos de uso
- repositorios
