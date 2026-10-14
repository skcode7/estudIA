import { Injectable, NotFoundException } from "@nestjs/common";

import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import {
  EvaluationImageRecord,
  EvaluationImageRepository
} from "../ports/evaluation-image.repository";

export interface EvaluationImageContent {
  image: EvaluationImageRecord;
  body: Buffer;
  mimeType: string;
}

@Injectable()
export class GetEvaluationImageUseCase {
  constructor(
    private readonly imageRepository: EvaluationImageRepository,
    private readonly objectStorage: ObjectStorage
  ) {}

  async execute(evaluationId: string, imageId: string): Promise<EvaluationImageContent> {
    const image = await this.imageRepository.findById(imageId);
    if (!image || image.evaluationId !== evaluationId) {
      throw new NotFoundException(
        `Imagen con id "${imageId}" no encontrada para la evaluación "${evaluationId}".`
      );
    }

    let body: Buffer;
    try {
      body = await this.objectStorage.getObject(image.storageKey);
    } catch {
      throw new NotFoundException("No se pudo leer la imagen del almacenamiento.");
    }

    return { image, body, mimeType: mimeTypeOf(image.storageKey) };
  }
}

function mimeTypeOf(storageKey: string): string {
  const dot = storageKey.lastIndexOf(".");
  const extension = dot === -1 ? "" : storageKey.slice(dot).toLowerCase();
  const byExtension: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp"
  };
  return byExtension[extension] ?? "image/jpeg";
}
