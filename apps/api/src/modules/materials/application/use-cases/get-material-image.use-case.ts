import { Injectable, NotFoundException } from "@nestjs/common";

import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import {
  MaterialImageRecord,
  MaterialImageRepository
} from "../ports/material-image.repository";

export interface MaterialImageContent {
  image: MaterialImageRecord;
  body: Buffer;
  mimeType: string;
}

@Injectable()
export class GetMaterialImageUseCase {
  constructor(
    private readonly imageRepository: MaterialImageRepository,
    private readonly objectStorage: ObjectStorage
  ) {}

  async execute(materialId: string, imageId: string): Promise<MaterialImageContent> {
    const image = await this.imageRepository.findById(imageId);
    if (!image || image.materialId !== materialId) {
      throw new NotFoundException(
        `Imagen con id "${imageId}" no encontrada para el material "${materialId}".`
      );
    }

    let body: Buffer;
    try {
      body = await this.objectStorage.getObject(image.storageKey);
    } catch {
      throw new NotFoundException("No se pudo leer la imagen del almacenamiento.");
    }

    return { image, body, mimeType: "image/webp" };
  }
}
