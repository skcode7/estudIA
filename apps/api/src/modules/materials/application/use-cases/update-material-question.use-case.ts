import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { MaterialImageRepository } from "../ports/material-image.repository";
import { MaterialRepository } from "../ports/material.repository";
import {
  MaterialQuestionOptionInput,
  MaterialQuestionRecord,
  MaterialQuestionRepository
} from "../ports/material-question.repository";

export interface UpdateMaterialQuestionFields {
  statement: string;
  explanation: string | null;
  difficulty: string;
  imageId: string | null;
  options: MaterialQuestionOptionInput[];
}

@Injectable()
export class UpdateMaterialQuestionUseCase {
  constructor(
    private readonly materials: MaterialRepository,
    private readonly questions: MaterialQuestionRepository,
    private readonly images: MaterialImageRepository
  ) {}

  async execute(
    materialId: string,
    questionId: string,
    fields: UpdateMaterialQuestionFields
  ): Promise<MaterialQuestionRecord> {
    const material = await this.materials.findById(materialId);
    if (!material) {
      throw new NotFoundException(`Material con id "${materialId}" no encontrado.`);
    }

    const statement = fields.statement.trim();
    if (!statement) {
      throw new BadRequestException("El enunciado es obligatorio.");
    }

    const options = fields.options.map((option) => ({
      text: option.text.trim(),
      isCorrect: option.isCorrect
    }));
    if (options.length < 2 || options.length > 6) {
      throw new BadRequestException("La pregunta debe tener entre 2 y 6 opciones.");
    }
    if (options.some((option) => !option.text)) {
      throw new BadRequestException("Todas las opciones deben tener texto.");
    }
    const correctCount = options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      throw new BadRequestException("La pregunta debe tener exactamente una opción correcta.");
    }

    if (fields.imageId) {
      const image = await this.images.findById(fields.imageId);
      if (!image || image.materialId !== materialId) {
        throw new BadRequestException(
          `La imagen "${fields.imageId}" no pertenece al material "${materialId}".`
        );
      }
    }

    const updated = await this.questions.update(materialId, questionId, {
      statement,
      explanation: fields.explanation?.trim() ? fields.explanation.trim() : null,
      difficulty: fields.difficulty,
      imageId: fields.imageId,
      options
    });
    if (!updated) {
      throw new NotFoundException(
        `Pregunta con id "${questionId}" no encontrada para el material "${materialId}".`
      );
    }
    return updated;
  }
}
