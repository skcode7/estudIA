import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { MaterialImageRepository } from "../ports/material-image.repository";
import { MaterialRepository } from "../ports/material.repository";

@Injectable()
export class DeleteMaterialUseCase {
  private readonly logger = new Logger(DeleteMaterialUseCase.name);

  constructor(
    private readonly repository: MaterialRepository,
    private readonly objectStorage: ObjectStorage,
    private readonly imageRepository: MaterialImageRepository
  ) {}

  async execute(id: string): Promise<void> {
    const material = await this.repository.findById(id);
    if (!material) {
      throw new NotFoundException(`Material con id "${id}" no encontrado.`);
    }

    const images = await this.imageRepository.listByMaterial(id);

    await this.repository.delete(id);

    const keys = [
      ...(material.storageKey ? [material.storageKey] : []),
      ...images.map((image) => image.storageKey)
    ];
    for (const key of keys) {
      try {
        await this.objectStorage.delete(key);
      } catch (error) {
        this.logger.warn(
          `No se pudo eliminar el objeto "${key}" del almacenamiento: ${String(error)}`
        );
      }
    }
  }
}
