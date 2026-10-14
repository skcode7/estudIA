import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import {
  assertValidQuestionOptions,
  QuestionOptionDraft
} from "../questions/evaluation-question-options";
import { EvaluationImageRepository } from "../ports/evaluation-image.repository";
import {
  EvaluationQuestionRecord,
  EvaluationQuestionRepository,
  EvaluationQuestionType
} from "../ports/evaluation-question.repository";
import { EvaluationRepository } from "../ports/evaluation.repository";

export interface UpdateEvaluationQuestionFields {
  /** Reclasifica la pregunta a otro tema de la misma materia. */
  topicId?: string;
  /** Convierte la pregunta a otro tipo (p. ej. de relleno a opción múltiple). */
  type?: EvaluationQuestionType;
  statement: string;
  explanation: string | null;
  difficulty: string;
  evaluationImageId: string | null;
  options: QuestionOptionDraft[];
}

@Injectable()
export class UpdateEvaluationQuestionUseCase {
  constructor(
    private readonly evaluations: EvaluationRepository,
    private readonly questions: EvaluationQuestionRepository,
    private readonly images: EvaluationImageRepository,
    private readonly topics: TopicRepository
  ) {}

  async execute(
    evaluationId: string,
    questionId: string,
    fields: UpdateEvaluationQuestionFields
  ): Promise<EvaluationQuestionRecord> {
    const evaluation = await this.evaluations.findById(evaluationId);
    if (!evaluation) {
      throw new NotFoundException(`Evaluación con id "${evaluationId}" no encontrada.`);
    }

    const existing = await this.questions.findByIdForEvaluation(evaluationId, questionId);
    if (!existing) {
      throw new NotFoundException(
        `Pregunta con id "${questionId}" no encontrada para la evaluación "${evaluationId}".`
      );
    }

    const statement = fields.statement.trim();
    if (!statement) {
      throw new BadRequestException("El enunciado es obligatorio.");
    }

    const type = fields.type ?? existing.type;
    const options = fields.options.map((option) => ({
      text: option.text.trim(),
      isCorrect: option.isCorrect
    }));
    assertValidQuestionOptions(type, options);

    const topicId = await this.resolveTopicId(evaluation.topicId, fields.topicId);
    if (fields.evaluationImageId) {
      const image = await this.images.findById(fields.evaluationImageId);
      if (!image || image.evaluationId !== evaluationId) {
        throw new BadRequestException(
          `La imagen "${fields.evaluationImageId}" no pertenece a la evaluación "${evaluationId}".`
        );
      }
    }

    const updated = await this.questions.update(evaluationId, questionId, {
      ...(topicId ? { topicId } : {}),
      type,
      statement,
      explanation: fields.explanation?.trim() ? fields.explanation.trim() : null,
      difficulty: fields.difficulty,
      evaluationImageId: fields.evaluationImageId,
      options
    });
    if (!updated) {
      throw new NotFoundException(
        `Pregunta con id "${questionId}" no encontrada para la evaluación "${evaluationId}".`
      );
    }
    return updated;
  }

  /** El tema debe existir y ser de la misma materia: si no, se deja el actual. */
  private async resolveTopicId(
    currentTopicId: string,
    topicId: string | undefined
  ): Promise<string | null> {
    const candidate = topicId?.trim();
    if (!candidate || candidate === currentTopicId) {
      return null;
    }
    const current = await this.topics.findById(currentTopicId);
    const target = await this.topics.findById(candidate);
    if (!target || !current || target.subjectId !== current.subjectId) {
      throw new BadRequestException(
        "El tema elegido no pertenece a la materia de la evaluación."
      );
    }
    return target.id;
  }
}
