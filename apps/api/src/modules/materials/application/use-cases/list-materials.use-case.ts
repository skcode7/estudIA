import { Injectable } from "@nestjs/common";

import { MaterialRepository } from "../ports/material.repository";
import { MaterialQuestionRepository, MaterialWithQuestionCount } from "../ports/material-question.repository";

@Injectable()
export class ListMaterialsUseCase {
  constructor(
    private readonly repository: MaterialRepository,
    private readonly questionRepository: MaterialQuestionRepository
  ) {}

  async execute(topicId: string): Promise<MaterialWithQuestionCount[]> {
    const materials = await this.repository.findByTopic(topicId);
    const counts = await this.questionRepository.countByMaterials(materials.map((m) => m.id));
    return materials.map((material) => ({
      material,
      questionCount: counts.get(material.id) ?? 0
    }));
  }
}