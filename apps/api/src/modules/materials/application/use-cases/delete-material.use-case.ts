import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { MaterialRepository } from "../ports/material.repository";

@Injectable()
export class DeleteMaterialUseCase {
  private readonly logger = new Logger(DeleteMaterialUseCase.name);

  constructor(
    private readonly repository: MaterialRepository,
    private readonly objectStorage: ObjectStorage
  ) {}

  async execute(id: string): Promise<void> {
    const material = await this.repository.findById(id);
    if (!material) {
      throw new NotFoundException(`Material con id "${id}" no encontrado.`);
    }

    await this.repository.delete(id);

    if (material.storageKey) {
      try {
        await this.objectStorage.delete(material.storageKey);
      } catch (error) {
        this.logger.warn(
          `No se pudo eliminar el objeto "${material.storageKey}" del almacenamiento: ${String(error)}`
        );
      }
    }
  }
}