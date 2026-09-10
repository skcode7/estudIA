import { Injectable, NotFoundException } from "@nestjs/common";

import { MaterialRecord, MaterialRepository } from "../ports/material.repository";

@Injectable()
export class GetMaterialUseCase {
  constructor(private readonly repository: MaterialRepository) {}

  async execute(id: string): Promise<MaterialRecord> {
    const material = await this.repository.findById(id);
    if (!material) {
      throw new NotFoundException(`Material con id "${id}" no encontrado.`);
    }
    return material;
  }
}