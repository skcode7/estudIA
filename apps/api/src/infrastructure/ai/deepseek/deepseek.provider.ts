import { Injectable } from "@nestjs/common";

import {
  AIProvider,
  AnalyzeEvaluationDraftInput,
  AnalyzeMaterialInput,
  EvaluationDraft,
  ExtractEvaluationQuestionsInput,
  ExtractedEvaluationQuestion,
  GenerateHintInput,
  GenerateQuestionsInput,
  ExplainAnswerInput,
  Explanation,
  GeneratedQuestion,
  Hint,
  MaterialAnalysis
} from "../../../modules/ai/application/ports/ai-provider";
import { DeepSeekClient } from "./deepseek.client";
import {
  toEvaluationDraft,
  toExtractedEvaluationQuestions,
  toGeneratedQuestions,
  toMaterialAnalysis
} from "./deepseek.mapper";
import {
  analyzeEvaluationDraftMessages,
  analyzeMessages,
  extractEvaluationQuestionsMessages,
  explainMessages,
  generateQuestionsMessages,
  hintMessages
} from "./deepseek.prompts";
import {
  evaluationDraftSchema,
  extractedEvaluationQuestionsSchema,
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
        questionMode: input.questionMode ?? "BASED_ON_MATERIAL",
        title: input.title,
        content,
        analysis: {
          summary: input.analysis?.summary ?? "",
          concepts: input.analysis?.concepts ?? [],
          objectives: input.analysis?.objectives ?? []
        },
        count: input.count,
        subjectName: input.subjectName,
        topicName: input.topicName,
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

  async analyzeEvaluationDraft(input: AnalyzeEvaluationDraftInput): Promise<EvaluationDraft> {
    const raw = await this.client.chat(analyzeEvaluationDraftMessages(input));
    return toEvaluationDraft(parseModelJson(evaluationDraftSchema, raw));
  }

  async extractEvaluationQuestions(
    input: ExtractEvaluationQuestionsInput
  ): Promise<ExtractedEvaluationQuestion[]> {
    const raw = await this.client.chat(
      extractEvaluationQuestionsMessages({
        subjectName: input.subjectName,
        title: input.title,
        images: input.images
      })
    );
    const validated = parseModelJson(extractedEvaluationQuestionsSchema, raw);
    const validImageIndexes = new Set(input.images.map((_, index) => index));
    const questions = toExtractedEvaluationQuestions(validated).filter(
      (question) => question.imageIndex === undefined || validImageIndexes.has(question.imageIndex)
    );
    if (questions.length === 0) {
      throw new Error("El modelo no devolvió preguntas válidas de la evaluación.");
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