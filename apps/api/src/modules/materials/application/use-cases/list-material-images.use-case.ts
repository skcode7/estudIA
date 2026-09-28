import { Injectable, NotFoundException } from "@nestjs/common";

import {
  MaterialImageRecord,
  MaterialImageRepository
} from "../ports/material-image.repository";
import { MaterialRepository } from "../ports/material.repository";

@Injectable()
export class ListMaterialImagesUseCase {
  constructor(
    private readonly materials: MaterialRepository,
    private readonly images: MaterialImageRepository
  ) {}

  async execute(materialId: string): Promise<MaterialImageRecord[]> {
    const material = await this.materials.findById(materialId);
    if (!material) {
      throw new NotFoundException(`Material con id "${materialId}" no encontrado.`);
    }
    return this.images.listByMaterial(materialId);
  }
}
