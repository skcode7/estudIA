import { BadRequestException, Injectable } from "@nestjs/common";

import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import { EvaluationImageRepository } from "../ports/evaluation-image.repository";
import { EvaluationQuestionRepository } from "../ports/evaluation-question.repository";
import { EvaluationRepository, EvaluationWithCounts } from "../ports/evaluation.repository";

@Injectable()
export class ListEvaluationsUseCase {
  constructor(
    private readonly repository: EvaluationRepository,
    private readonly questionRepository: EvaluationQuestionRepository,
    private readonly imageRepository: EvaluationImageRepository,
    private readonly topicRepository: TopicRepository
  ) {}

  /** Las evaluaciones cuelgan de un tema, como los materiales. */
  async execute(subjectId: string): Promise<EvaluationWithCounts[]> {
    const subjectIdTrimmed = subjectId?.trim();
    if (!subjectIdTrimmed) {
      throw new BadRequestException("El parámetro \"subjectId\" es obligatorio.");
    }

    const topics = await this.topicRepository.findAll({ subjectId: subjectIdTrimmed });
    if (topics.length === 0) {
      return [];
    }

    const evaluations = await this.repository.findByTopicIds(topics.map((topic) => topic.id));
    if (evaluations.length === 0) {
      return [];
    }

    const ids = evaluations.map((evaluation) => evaluation.id);
    const [questionCounts, imageCounts] = await Promise.all([
      this.questionRepository.countByEvaluations(ids),
      this.countImages(ids)
    ]);

    return evaluations.map((evaluation) => ({
      evaluation,
      questionCount: questionCounts.get(evaluation.id) ?? 0,
      imageCount: imageCounts.get(evaluation.id) ?? 0
    }));
  }

  private async countImages(ids: string[]): Promise<Map<string, number>> {
    const counts = await Promise.all(
      ids.map(async (id) => (await this.imageRepository.listByEvaluation(id)).length)
    );
    return new Map(ids.map((id, index) => [id, counts[index] ?? 0]));
  }
}
