import { Injectable, NotFoundException } from "@nestjs/common";

import {
  MaterialRecord,
  MaterialRepository,
  UpdateMaterialFieldsInput
} from "../ports/material.repository";

@Injectable()
export class UpdateMaterialUseCase {
  constructor(private readonly repository: MaterialRepository) {}

  async execute(id: string, fields: UpdateMaterialFieldsInput): Promise<MaterialRecord> {
    const material = await this.repository.findById(id);
    if (!material) {
      throw new NotFoundException(`Material con id "${id}" no encontrado.`);
    }
    return this.repository.updateFields(id, fields);
  }
}