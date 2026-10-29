import { Injectable, NotFoundException } from "@nestjs/common";

import { MaterialImageRepository } from "../ports/material-image.repository";
import { MaterialRepository, MaterialWithCounts } from "../ports/material.repository";
import { MaterialQuestionRepository } from "../ports/material-question.repository";

@Injectable()
export class GetMaterialUseCase {
  constructor(
    private readonly repository: MaterialRepository,
    private readonly questionRepository: MaterialQuestionRepository,
    private readonly imageRepository: MaterialImageRepository
  ) {}

  async execute(id: string): Promise<MaterialWithCounts> {
    const material = await this.repository.findById(id);
    if (!material) {
      throw new NotFoundException(`Material con id "${id}" no encontrado.`);
    }
    const [questionCounts, imageCounts] = await Promise.all([
      this.questionRepository.countByMaterials([id]),
      this.imageRepository.countByMaterials([id])
    ]);
    return {
      material,
      questionCount: questionCounts.get(id) ?? 0,
      imageCount: imageCounts.get(id) ?? 0
    };
  }
}