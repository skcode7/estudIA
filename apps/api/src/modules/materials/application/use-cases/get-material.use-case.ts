import { Injectable, NotFoundException } from "@nestjs/common";

import { MaterialRepository } from "../ports/material.repository";
import { MaterialQuestionRepository, MaterialWithQuestionCount } from "../ports/material-question.repository";

@Injectable()
export class GetMaterialUseCase {
  constructor(
    private readonly repository: MaterialRepository,
    private readonly questionRepository: MaterialQuestionRepository
  ) {}

  async execute(id: string): Promise<MaterialWithQuestionCount> {
    const material = await this.repository.findById(id);
    if (!material) {
      throw new NotFoundException(`Material con id "${id}" no encontrado.`);
    }
    const counts = await this.questionRepository.countByMaterials([id]);
    return { material, questionCount: counts.get(id) ?? 0 };
  }
}