import { Injectable } from "@nestjs/common";

import {
  AIProvider,
  AnalyzeMaterialInput,
  GenerateHintInput,
  GenerateQuestionsInput,
  ExplainAnswerInput,
  Explanation,
  GeneratedQuestion,
  Hint,
  MaterialAnalysis
} from "../../../modules/ai/application/ports/ai-provider";
import { DeepSeekClient } from "./deepseek.client";
import { toGeneratedQuestions, toMaterialAnalysis } from "./deepseek.mapper";
import {
  analyzeMessages,
  explainMessages,
  generateQuestionsMessages,
  hintMessages
} from "./deepseek.prompts";
import {
  generatedQuestionsSchema,
  materialAnalysisSchema
} from "./deepseek.schemas";
import { parseModelJson } from "../model-output";

@Injectable()
export class DeepSeekProvider implements AIProvider {
  constructor(private readonly client: DeepSeekClient) {}

  async analyzeMaterial(input: AnalyzeMaterialInput): Promise<MaterialAnalysis> {
    const raw = await this.client.chat(analyzeMessages(input));
    return toMaterialAnalysis(parseModelJson(materialAnalysisSchema, raw));
  }

  async generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> {
    const content = input.analysis?.extractedContent ?? input.content;
    const raw = await this.client.chat(
      generateQuestionsMessages({
        title: input.title,
        content,
        analysis: {
          summary: input.analysis?.summary ?? "",
          concepts: input.analysis?.concepts ?? [],
          objectives: input.analysis?.objectives ?? []
        },
        count: input.count,
        images: input.images
      })
    );
    const validated = parseModelJson(generatedQuestionsSchema, raw);
    const validImageIndexes = new Set((input.images ?? []).map((image) => image.index));
    const questions = toGeneratedQuestions(validated).filter(
      (question) => question.imageIndex === undefined || validImageIndexes.has(question.imageIndex)
    );
    if (questions.length === 0) {
      throw new Error("El modelo no devolvió preguntas válidas (ninguna con exactamente una respuesta correcta).");
    }
    return questions;
  }

  async explainAnswer(input: ExplainAnswerInput): Promise<Explanation> {
    const raw = await this.client.chat(explainMessages(input), { json: false });
    return { text: raw.trim() };
  }

  async generateHint(input: GenerateHintInput): Promise<Hint> {
    const raw = await this.client.chat(hintMessages(input), { json: false });
    return { text: raw.trim() };
  }
}