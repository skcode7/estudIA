import { Injectable, NotFoundException } from "@nestjs/common";

import { EvaluationRepository } from "../ports/evaluation.repository";
import {
  EvaluationQuestionRecord,
  EvaluationQuestionRepository
} from "../ports/evaluation-question.repository";

@Injectable()
export class ListEvaluationQuestionsUseCase {
  constructor(
    private readonly evaluations: EvaluationRepository,
    private readonly questions: EvaluationQuestionRepository
  ) {}

  async execute(evaluationId: string): Promise<EvaluationQuestionRecord[]> {
    const evaluation = await this.evaluations.findById(evaluationId);
    if (!evaluation) {
      throw new NotFoundException(`Evaluación con id "${evaluationId}" no encontrada.`);
    }
    return this.questions.listByEvaluation(evaluationId);
  }
}
