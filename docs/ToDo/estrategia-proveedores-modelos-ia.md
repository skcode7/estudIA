# Requerimiento: estrategia de proveedores y modelos de IA

## Contexto

La arquitectura actual expone dos puertos de aplicación (`AIProvider` y `MaterialImageExtractor`) y un registro que selecciona la implementación mediante `AI_PROVIDER` (solo `deepseek` hoy) y `OPENROUTER_API_KEY` para la extracción de figuras. Los adaptadores vivos están en `apps/api/src/infrastructure/ai/deepseek/` y `openrouter/`. La frontera prohíbe llamar proveedores desde controladores o casos de uso (AGENTS.md).

Se evaluó **FreeLLMAPI** (https://freellmapi.co) como gateway OpenAI-compatible que aglutina ~34 proveedores gratuitos con routing, failover y selección por modelo (`auto`, `auto:fast`, `auto:smart`, perfiles nombrados). También se evaluó **Jev** (https://jevai.net) como modelo clasificador "System One" que devuelve salidas tipadas (Choice/Score/Noul) con confianza calibrada, latencia 70–500 ms, sin generación de texto libre.

Observaciones clave del código actual:
- `AIProviderId` es un literal `"deepseek"` y el registry lanza error si el valor difiere (`apps/api/src/infrastructure/ai/ai.registry.ts:19-28`).
- El módulo `AIModule` inyecta el proveedor resuelto una vez al arranque (`apps/api/src/modules/ai/ai.module.ts:20-24`).
- Los clientes de DeepSeek y OpenRouter leen clave y modelo en cada llamada desde `process.env` (`deepseek.client.ts:60-68`, `openrouter.client.ts:57-68`).
- Los prompts y schemas Zod viven en `infrastructure/ai`; la validación de salida es parte del adaptador (`model-output.ts`, `deepseek.provider.ts:54-73`).
- `ProcessMaterialUseCase` y `AnalyzeMaterialDraftUseCase` invocan `aiProvider.analyzeMaterial` y `generateQuestions`; la extracción de figuras usa `MaterialImageExtractor` por separado.
- Ya existe `docs/ToDo/procesamiento-documentos-ia.md` que anticipa documentos no imagen (PDF/DOCX) y menciona evaluar un proveedor por formato usando el mismo registry.

## Objetivo

Definir y documentar una estrategia para:
1. Reemplazar el proveedor único por una selección configurable por capacidad/tarea, manteniendo la frontera puerto/adaptador.
2. Incorporar FreeLLMAPI como gateway local (self-hosted) sin acoplar el dominio.
3. Evaluar un modelo clasificador (tipo Jev) para decisiones estructuradas dentro del pipeline.
4. Preparar el pipeline para futuros tipos de material (PDF, video, audio, enlaces web) con modelos especializados por modalidad.

## Alcance propuesto

### 1. Adaptador FreeLLMAPI compatible con OpenAI
- Crear `apps/api/src/infrastructure/ai/freellmapi/` con `FreellmapiClient`, `FreellmapiProvider` (implementa `AIProvider`) y `FreellmapiImageExtractor` (implementa `MaterialImageExtractor`).
- El cliente usa `baseUrl: process.env.FREELLAPI_BASE_URL ?? "http://localhost:3001/v1"` y `apiKey: process.env.FREELLAPI_KEY`.
- El provider mapea cada método del puerto a `chat.completions` con el modelo adecuado (ver registro de capacidades).
- Registrar `"freellmapi"` en `AIProviderId` y en `CommonAIProviderRegistry` sin tocar casos de uso.

### 2. Registro de capacidades de modelos (`ModelCapabilityRegistry`)
- Fuente de verdad declarativa (JSON/TS) versionada en el repo, no solo descubrimiento en caliente.
- Cada entrada: `modelId`, `provider`, `capabilities: ("text" | "vision" | "ocr" | "structured" | "audio" | "video")[]`, `contextWindow`, `latencyClass`, `quotaProfile`, `reliabilityScore`, `supportedLocales`, `version`.
- Perfiles por tarea: `analysis`, `questionGeneration`, `figureExtraction`, `evaluationExtraction`, `explanation`, `hint`, `classification`, `routing`.
- Un servicio `ModelSelector` elige el modelo según perfil, excluyendo los que no cubren la capacidad requerida.
- `auto` solo para tareas tolerantes al cambio; tareas críticas usan modelo fijo y versionado.

### 3. Puerto `AIClassifier` (o `ClassificationProvider`)
- Interfaz independiente de `AIProvider` para decisiones estructuradas:
  - `classifySubjectTopic(input: { content: string; catalog: Catalog }) → { subjectId, topicId, confidence }`
  - `classifyMaterialType(input: { mimeType, extension, firstBytes }) → { type: "image" | "pdf" | "video" | "audio" | "web" | "unknown", confidence }`
  - `validateAnalysisQuality(input: { analysis: MaterialAnalysis; originalContent }) → { ok: boolean; issues: string[]; confidence }`
  - `routeModel(input: { task: Profile; candidates: ModelId[] }) → { modelId: string; reason: string }`
- Implementación inicial con el mismo adaptador FreeLLMAPI usando `response_format: json_schema` (structured output) o un modelo pequeño y rápido (p. ej. `gemini-2.5-flash-lite`, `glm-4.5-flash`, `qwen3-5-9b`).
- Evaluar Jev/DefAPI como backend alternativo para este puerto: validar API oficial, privacidad, términos, calibración con dataset real anonimizado.

### 4. Pipeline por modalidad de material
| Modalidad | Paso 1: Ingesta | Paso 2: Extracción | Paso 3: Clasificación/Enrutamiento | Paso 4: Generación |
|---|---|---|---|---|
| Texto | directo | — | `classifySubjectTopic` → `analysis` | `generateQuestions` |
| Imagen | storage → base64 | visión/OCR (`vision` + `ocr`) | `classifyMaterialType` + `classifySubjectTopic` + `validateAnalysisQuality` | `generateQuestions` (con `images` hints) |
| PDF | parser local (pdf-parse / pdfjs) → texto + raster páginas | OCR/VLM por página si hace falta | igual que imagen | igual |
| Video | metadatos + subtítulos/transcripción (whisper) + keyframes | speech-to-text + visión keyframes | clasificar tema + validar | preguntas mixtas texto/imagen |
| Audio | transcripción (whisper / proveedor audio) | — | clasificar tema | preguntas sobre transcripción |
| Enlace web | fetch + sanitize (readability) | texto limpio | clasificar tema | preguntas |

### 5. Observabilidad y guardrails
- Log estructurado por petición: `modelId`, `providerEffectivo`, `latencyMs`, `fallbackAttempts`, `schemaErrors`, `quotaRemaining`, `confidence` (si clasificador).
- Umbrales de confianza: si `classifier.confidence < 0.75` → marcar para revisión manual / fallback a modelo mayor.
- Fallback chain explícita por perfil (no solo `auto`).
- Test de humo nocturno contra dataset pequeño de materiales escolares reales anonimizados.

### 6. Privacidad y cumplimiento
- FreeLLMAPI: self-hosted, single-user, no exponer públicamente (sus términos lo limitan a uso personal).
- Revisar ToS de cada proveedor upstream habilitado (Google, Groq, NVIDIA, OpenRouter, Cloudflare, HuggingFace, Z.ai, GitHub Models, Cohere — varios con cláusulas de "evaluation only", "no resale", "no competing service").
- Jev/DefAPI: revisar privacidad, retención, jurisdicción, SLA antes de enviar materiales escolares.
- No enviar datos a proveedores sin clave propia configurada localmente.

## Cambios implicados

### Backend
- `apps/api/src/infrastructure/ai/freellmapi/` (nuevo adaptador).
- `apps/api/src/modules/ai/application/ports/ai-provider.ts`: ampliar `AIProviderId` y añadir `AIClassifier` (nuevo puerto).
- `apps/api/src/infrastructure/ai/ai.registry.ts`: registrar `freellmapi` y proveedor de clasificación.
- `apps/api/src/modules/ai/ai.module.ts`: binding condicional por `AI_PROVIDER` y `CLASSIFIER_PROVIDER`.
- `apps/api/src/modules/ai/application/services/model-selector.ts` (nuevo).
- `apps/api/src/modules/ai/application/services/model-capability-registry.ts` (nuevo, fuente declarativa).
- `ProcessMaterialUseCase`, `AnalyzeMaterialDraftUseCase`: inyectar `ModelSelector` y `AIClassifier`; delegar elección de modelo y clasificación.
- Configuración por entorno: `FREELLAPI_BASE_URL`, `FREELLAPI_KEY`, `CLASSIFIER_PROVIDER`, `CLASSIFIER_MODEL`, perfiles por tarea.

### Frontend
- Sin cambios esperados en la interfaz; el disparo de procesamiento sigue igual.
- Opcional: mostrar en la vista de material qué modelo/proveedor se usó (badge informativo).

## Fuera de alcance (por ahora)

- Multi-tenancy, autenticación, cuotas por usuario.
- Workers/colas asíncronas (MVP es on-demand).
- Fine-tuning o distilación de modelos.
- Exposición pública del gateway FreeLLMAPI.
- Sustituir todos los prompts actuales de una vez; migración gradual por perfil.
- Modelo clasificador en producción sin validación de calibración con datos reales.

## Notas

- Coherencia con AGENTS.md: el dominio no conoce proveedores; los casos de uso dependen de interfaces; la implementación concreta vive en `infrastructure`.
- `docs/ToDo/procesamiento-documentos-ia.md` y `docs/ToDo/generacion-inteligente-quiz.md` son requerimientos hermanos; este ToDo provee la infraestructura de selección de modelos que ambos necesitarán.
- Precedente: `decisions/proveedor-ia.md` ya justifica el puerto y dos proveedores; este ToDo lo generaliza a N proveedores y N capacidades.
- FreeLLMAPI expone `X-Routed-Via`, `X-Fallback-Trail`, `X-Fallback-Detail` en headers de respuesta; aprovecharlos para observabilidad.
- El catálogo de FreeLLMAPI se actualiza solo (signed feed); la versión free recibe cambios a 30 días; premium same-day. Para estabilidad, fijar modelos críticos en el registry declarativo.
- Jev no genera texto: no sirve para `explainAnswer`, `generateHint`, `generateQuestions`, `summary`. Sí sirve para `classify`, `route`, `score`, `gate`.
- Dataset de evaluación: recopilar 30–50 materiales escolares anonimizados (fotos, PDFs, textos) con etiquetas de materia/tema y calidad esperada para validar clasificador y selección de modelos.