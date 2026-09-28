import { Injectable, NotFoundException } from "@nestjs/common";

import { MaterialRepository } from "../ports/material.repository";
import { MaterialQuestionRepository } from "../ports/material-question.repository";

@Injectable()
export class DeleteMaterialQuestionUseCase {
  constructor(
    private readonly materials: MaterialRepository,
    private readonly questions: MaterialQuestionRepository
  ) {}

  async execute(materialId: string, questionId: string): Promise<void> {
    const material = await this.materials.findById(materialId);
    if (!material) {
      throw new NotFoundException(`Material con id "${materialId}" no encontrado.`);
    }

    const deleted = await this.questions.delete(materialId, questionId);
    if (!deleted) {
      throw new NotFoundException(
        `Pregunta con id "${questionId}" no encontrada para el material "${materialId}".`
      );
    }
  }
}
