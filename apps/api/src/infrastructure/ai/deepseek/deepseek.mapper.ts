import {
  GeneratedQuestion,
  MaterialAnalysis
} from "../../../modules/ai/application/ports/ai-provider";
import {
  GeneratedQuestionsPayload,
  MaterialAnalysisPayload
} from "./deepseek.schemas";

export function toMaterialAnalysis(payload: MaterialAnalysisPayload): MaterialAnalysis {
  return {
    suggestedTitle: payload.suggestedTitle,
    summary: payload.summary,
    concepts: payload.concepts,
    objectives: payload.objectives,
    extractedContent: payload.extractedContent ?? null
  };
}

export function toGeneratedQuestions(payload: GeneratedQuestionsPayload): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];

  for (const question of payload.questions) {
    const correctOptions = question.options.filter((option) => option.isCorrect);
    if (correctOptions.length !== 1) {
      continue;
    }
    questions.push({
      statement: question.statement,
      explanation: question.explanation,
      difficulty: question.difficulty,
      options: question.options.map((option) => ({
        text: option.text,
        isCorrect: option.isCorrect
      }))
    });
  }

  return questions;
}