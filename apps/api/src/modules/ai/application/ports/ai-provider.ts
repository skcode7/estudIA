export type AIProviderId = "deepseek";

export interface AnalyzeMaterialInput {
  title?: string;
  content: string;
  image?: {
    mimeType: string;
    body: Buffer;
  } | null;
}

export interface MaterialAnalysis {
  suggestedTitle?: string;
  summary: string;
  concepts: string[];
  objectives: string[];
  extractedContent?: string | null;
}

export interface GenerateQuestionsInput {
  title?: string;
  content: string;
  analysis?: MaterialAnalysis;
  count: number;
}

export interface GeneratedQuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface GeneratedQuestion {
  statement: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
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