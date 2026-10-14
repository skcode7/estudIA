import {
  EvaluationDraft,
  ExtractedEvaluationQuestion,
  GeneratedQuestion,
  MaterialAnalysis
} from "../../../modules/ai/application/ports/ai-provider";
import {
  EvaluationDraftPayload,
  ExtractedEvaluationQuestionsPayload,
  GeneratedQuestionsPayload,
  MaterialAnalysisPayload
} from "./deepseek.schemas";

const TRUE_LABEL = "Verdadero";
const FALSE_LABEL = "Falso";

export function toMaterialAnalysis(payload: MaterialAnalysisPayload): MaterialAnalysis {
  return {
    suggestedTitle: payload.suggestedTitle,
    suggestedSubjectId: payload.suggestedSubjectId ?? null,
    suggestedTopicId: payload.suggestedTopicId ?? null,
    summary: payload.summary,
    concepts: payload.concepts,
    objectives: payload.objectives,
    extractedContent: payload.extractedContent ?? null,
    hasEmbeddedFigures: payload.hasEmbeddedFigures
  };
}

export function toEvaluationDraft(payload: EvaluationDraftPayload): EvaluationDraft {
  return {
    suggestedTitle: payload.suggestedTitle,
    suggestedSubjectId: payload.suggestedSubjectId ?? null,
    suggestedTopicId: payload.suggestedTopicId ?? null
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
      imageIndex: question.imageIndex,
      options: question.options.map((option) => ({
        text: option.text,
        isCorrect: option.isCorrect
      }))
    });
  }

  return questions;
}

/**
 * Normaliza los tres tipos a la misma forma (enunciado + opciones con la
 * correcta marcada), que es lo que el quiz sabe presentar y calificar. Lo que
 * el modelo no deja bien —una de opción múltiple sin clave clara, un relleno sin
 * respuestas— se descarta en lugar de inventar la respuesta que falta.
 */
export function toExtractedEvaluationQuestions(
  payload: ExtractedEvaluationQuestionsPayload
): ExtractedEvaluationQuestion[] {
  const questions: ExtractedEvaluationQuestion[] = [];

  for (const question of payload.questions) {
    const options = toOptions(question);
    if (!options) {
      continue;
    }
    questions.push({
      type: question.type,
      statement: question.statement,
      explanation: question.explanation,
      difficulty: question.difficulty,
      imageIndex: question.imageIndex,
      options
    });
  }

  return questions;
}

function toOptions(
  question: ExtractedEvaluationQuestionsPayload["questions"][number]
): ExtractedEvaluationQuestion["options"] | null {
  if (question.type === "TRUE_FALSE") {
    // El modelo solo dice si la afirmación es verdadera: las dos opciones las
    // pone el mapper, siempre en el mismo orden.
    return [
      { text: TRUE_LABEL, isCorrect: question.answer },
      { text: FALSE_LABEL, isCorrect: !question.answer }
    ];
  }

  const candidates =
    question.type === "MULTIPLE_CHOICE"
      ? question.options.map((option) => ({
          text: option.text,
          isCorrect: option.isCorrect
        }))
      : dedupeAnswers(question.answers.map((answer) => ({ text: answer, isCorrect: true })));

  if (candidates.length === 0) {
    return null;
  }
  // En un relleno todas las respuestas son correctas; en una de opción múltiple
  // tiene que haber exactamente una.
  if (
    question.type === "MULTIPLE_CHOICE" &&
    candidates.filter((candidate) => candidate.isCorrect).length !== 1
  ) {
    return null;
  }
  return candidates;
}

/** "París" y "paris" son la misma respuesta aceptada: no tiene sentido duplicarla. */
function dedupeAnswers(
  answers: { text: string; isCorrect: boolean }[]
): { text: string; isCorrect: boolean }[] {
  const seen = new Set<string>();
  const unique: { text: string; isCorrect: boolean }[] = [];
  for (const answer of answers) {
    const key = normalizeForCompare(answer.text);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(answer);
  }
  return unique;
}

function normalizeForCompare(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .toLowerCase();
}
