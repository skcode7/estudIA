export type AIProviderId = "deepseek";

export interface MaterialCatalogTopic {
  id: string;
  name: string;
}

export interface MaterialCatalogSubject {
  id: string;
  name: string;
  topics: MaterialCatalogTopic[];
}

export interface AnalyzeMaterialInput {
  title?: string;
  content: string;
  image?: {
    mimeType: string;
    body: Buffer;
  } | null;
  /**
   * Catálogo de materias y temas existentes. Si se envía, el proveedor puede
   * sugerir a cuál de ellos pertenece el material.
   */
  catalog?: MaterialCatalogSubject[];
}

export interface MaterialAnalysis {
  suggestedTitle?: string;
  suggestedSubjectId?: string | null;
  suggestedTopicId?: string | null;
  summary: string;
  concepts: string[];
  objectives: string[];
  extractedContent?: string | null;
  /**
   * Marca si la imagen del material contiene figuras propias (banderas, mapas,
   * diagramas…) además del texto escrito. La cantidad de figuras la determina
   * después el modelo especialista de visión.
   */
  hasEmbeddedFigures?: boolean;
}

export interface MaterialImageHint {
  /** Índice estable de la imagen; se usa para referenciarla en las preguntas. */
  index: number;
  /** Descripción breve de la figura (p. ej. "bandera de Francia"). */
  label: string;
}

export interface GenerateQuestionsInput {
  title?: string;
  content: string;
  analysis?: MaterialAnalysis;
  count: number;
  /**
   * Imágenes extraídas del material disponibles para preguntas del tipo
   * "¿A qué corresponde esta imagen?".
   */
  images?: MaterialImageHint[];
}

export interface GeneratedQuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface GeneratedQuestion {
  statement: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  /** Índice de la imagen del enunciado (p. ej. "¿A qué corresponde esta imagen?"). */
  imageIndex?: number;
  options: GeneratedQuestionOption[];
}

export interface ExplainAnswerInput {
  question: string;
  options: string[];
  correctOption: string;
  selectedOption?: string;
}

export interface Explanation {
  text: string;
}

export interface GenerateHintInput {
  question: string;
  options: string[];
}

export interface Hint {
  text: string;
}

export abstract class AIProvider {
  abstract analyzeMaterial(input: AnalyzeMaterialInput): Promise<MaterialAnalysis>;
  abstract generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]>;
  abstract explainAnswer(input: ExplainAnswerInput): Promise<Explanation>;
  abstract generateHint(input: GenerateHintInput): Promise<Hint>;
}

export abstract class AIProviderRegistry {
  abstract get(provider: AIProviderId): AIProvider;
}