import { Injectable, NotFoundException } from "@nestjs/common";

import { MaterialRepository } from "../ports/material.repository";
import {
  MaterialQuestionRecord,
  MaterialQuestionRepository
} from "../ports/material-question.repository";

@Injectable()
export class ListMaterialQuestionsUseCase {
  constructor(
    private readonly materials: MaterialRepository,
    private readonly questions: MaterialQuestionRepository
  ) {}

  async execute(materialId: string): Promise<MaterialQuestionRecord[]> {
    const material = await this.materials.findById(materialId);
    if (!material) {
      throw new NotFoundException(`Material con id "${materialId}" no encontrado.`);
    }
    return this.questions.listByMaterial(materialId);
  }
}
