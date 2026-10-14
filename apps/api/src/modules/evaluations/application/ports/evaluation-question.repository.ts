export interface EvaluationQuestionOptionInput {
  text: string;
  isCorrect: boolean;
}

export type EvaluationQuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK";

export interface EvaluationQuestionInput {
  topicId: string;
  type: EvaluationQuestionType;
  statement: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  /** Foto de la evaluación de la que sale la pregunta (null si no se indicó). */
  evaluationImageId: string | null;
  options: EvaluationQuestionOptionInput[];
}

export interface EvaluationQuestionOptionRecord {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface EvaluationQuestionRecord {
  id: string;
  topicId: string;
  sourceEvaluationId: string | null;
  type: EvaluationQuestionType;
  statement: string;
  explanation: string | null;
  difficulty: string;
  evaluationImageId: string | null;
  options: EvaluationQuestionOptionRecord[];
}

export interface UpdateEvaluationQuestionInput {
  /** Permite reclasificar la pregunta a otro tema de la misma materia. */
  topicId?: string;
  type?: EvaluationQuestionType;
  statement: string;
  explanation: string | null;
  difficulty: string;
  evaluationImageId: string | null;
  options: EvaluationQuestionOptionInput[];
}

export abstract class EvaluationQuestionRepository {
  abstract countByEvaluations(sourceEvaluationIds: string[]): Promise<Map<string, number>>;
  abstract replaceForEvaluation(
    sourceEvaluationId: string,
    questions: EvaluationQuestionInput[]
  ): Promise<number>;
  abstract listByEvaluation(sourceEvaluationId: string): Promise<EvaluationQuestionRecord[]>;
  abstract findByIdForEvaluation(
    sourceEvaluationId: string,
    questionId: string
  ): Promise<EvaluationQuestionRecord | null>;
  abstract update(
    sourceEvaluationId: string,
    questionId: string,
    input: UpdateEvaluationQuestionInput
  ): Promise<EvaluationQuestionRecord | null>;
  abstract delete(sourceEvaluationId: string, questionId: string): Promise<boolean>;
}
