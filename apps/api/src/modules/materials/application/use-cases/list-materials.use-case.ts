import { Injectable } from "@nestjs/common";

import { MaterialImageRepository } from "../ports/material-image.repository";
import { MaterialRepository, MaterialWithCounts } from "../ports/material.repository";
import { MaterialQuestionRepository } from "../ports/material-question.repository";

@Injectable()
export class ListMaterialsUseCase {
  constructor(
    private readonly repository: MaterialRepository,
    private readonly questionRepository: MaterialQuestionRepository,
    private readonly imageRepository: MaterialImageRepository
  ) {}

  async execute(
    topicId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ items: MaterialWithCounts[]; total: number }> {
    const { items, total } = await this.repository.findByTopic(topicId, options);
    const ids = items.map((m) => m.id);
    const [questionCounts, imageCounts] = await Promise.all([
      this.questionRepository.countByMaterials(ids),
      this.imageRepository.countByMaterials(ids)
    ]);
    return {
      items: items.map((material) => ({
        material,
        questionCount: questionCounts.get(material.id) ?? 0,
        imageCount: imageCounts.get(material.id) ?? 0
      })),
      total
    };
  }
}
