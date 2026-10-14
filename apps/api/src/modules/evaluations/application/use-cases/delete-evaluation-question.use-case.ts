import { Injectable, NotFoundException } from "@nestjs/common";

import { EvaluationRepository } from "../ports/evaluation.repository";
import { EvaluationQuestionRepository } from "../ports/evaluation-question.repository";

@Injectable()
export class DeleteEvaluationQuestionUseCase {
  constructor(
    private readonly evaluations: EvaluationRepository,
    private readonly questions: EvaluationQuestionRepository
  ) {}

  async execute(evaluationId: string, questionId: string): Promise<void> {
    const evaluation = await this.evaluations.findById(evaluationId);
    if (!evaluation) {
      throw new NotFoundException(`Evaluación con id "${evaluationId}" no encontrada.`);
    }

    const deleted = await this.questions.delete(evaluationId, questionId);
    if (!deleted) {
      throw new NotFoundException(
        `Pregunta con id "${questionId}" no encontrada para la evaluación "${evaluationId}".`
      );
    }
  }
}
