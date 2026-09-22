import { Injectable, NotFoundException } from "@nestjs/common";

import {
  MaterialRepository,
  UpdateMaterialFieldsInput
} from "../ports/material.repository";
import { MaterialQuestionRepository, MaterialWithQuestionCount } from "../ports/material-question.repository";

@Injectable()
export class UpdateMaterialUseCase {
  constructor(
    private readonly repository: MaterialRepository,
    private readonly questionRepository: MaterialQuestionRepository
  ) {}

  async execute(id: string, fields: UpdateMaterialFieldsInput): Promise<MaterialWithQuestionCount> {
    const material = await this.repository.findById(id);
    if (!material) {
      throw new NotFoundException(`Material con id "${id}" no encontrado.`);
    }
    const updated = await this.repository.updateFields(id, fields);
    const counts = await this.questionRepository.countByMaterials([id]);
    return { material: updated, questionCount: counts.get(id) ?? 0 };
  }
}