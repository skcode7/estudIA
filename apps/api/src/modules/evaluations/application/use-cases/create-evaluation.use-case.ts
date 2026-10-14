import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import { EvaluationImageRepository } from "../ports/evaluation-image.repository";
import {
  EvaluationRecord,
  EvaluationRepository
} from "../ports/evaluation.repository";

const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp"
};

const SUPPORTED_IMAGE_MIME_TYPES = new Set(Object.values(SUPPORTED_IMAGE_TYPES));

export interface EvaluationImageUpload {
  originalName: string;
  contentType: string;
  body: Buffer;
}

export interface CreateEvaluationInput {
  topicId: string;
  title: string;
  /** Fecha en la que se realizó la evaluación (ISO), opcional. */
  dateTaken?: string | null;
  images: EvaluationImageUpload[];
}

@Injectable()
export class CreateEvaluationUseCase {
  constructor(
    private readonly repository: EvaluationRepository,
    private readonly imageRepository: EvaluationImageRepository,
    private readonly topicRepository: TopicRepository,
    private readonly objectStorage: ObjectStorage
  ) {}

  async execute(input: CreateEvaluationInput): Promise<EvaluationRecord> {
    const topic = await this.topicRepository.findById(input.topicId);
    if (!topic) {
      throw new NotFoundException(`Tema con id "${input.topicId}" no encontrado.`);
    }

    if (input.images.length === 0) {
      throw new BadRequestException("La evaluación necesita al menos una foto.");
    }

    const evaluationId = randomUUID();
    const stored: { storageKey: string; label: string; order: number }[] = [];
    for (const [order, image] of input.images.entries()) {
      const { mimeType, extension } = resolveImageType(image);
      const key = `evaluations/${evaluationId}/images/${randomUUID()}${extension}`;
      try {
        const uploaded = await this.objectStorage.upload({
          key,
          body: image.body,
          contentType: mimeType
        });
        stored.push({ storageKey: uploaded.key, label: `Página ${order + 1}`, order });
      } catch {
        // Si una foto falla no se deja una evaluación a medias en el almacenamiento.
        await this.deleteQuietly(stored.map((item) => item.storageKey));
        throw new ServiceUnavailableException("No se pudo guardar una de las fotos. Intenta de nuevo.");
      }
    }

    const evaluation = await this.repository.create({
      id: evaluationId,
      topicId: topic.id,
      title: input.title.trim(),
      dateTaken: parseDateTaken(input.dateTaken)
    });
    await this.imageRepository.createMany(evaluation.id, stored);
    return evaluation;
  }

  private async deleteQuietly(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.objectStorage.delete(key);
      } catch {
        // Un objeto huérfano no debe impedir responder al usuario.
      }
    }
  }
}

/**
 * Una evaluación son fotos de un examen: solo se aceptan imágenes. El tipo se
 * resuelve por extensión y, si el nombre no la trae, por el content-type.
 */
function resolveImageType(image: EvaluationImageUpload): { mimeType: string; extension: string } {
  const extension = extname(image.originalName).toLowerCase();
  const mimeType = SUPPORTED_IMAGE_TYPES[extension] ?? image.contentType;
  const supported = SUPPORTED_IMAGE_MIME_TYPES.has(mimeType);
  if (!supported) {
    throw new BadRequestException(
      "Solo se aceptan imágenes (JPG, PNG, GIF, WebP) en las evaluaciones."
    );
  }
  return {
    mimeType,
    extension: extension && SUPPORTED_IMAGE_TYPES[extension] ? extension : extensionByMimeType(mimeType)
  };
}

function extensionByMimeType(mimeType: string): string {
  const entry = Object.entries(SUPPORTED_IMAGE_TYPES).find(([, value]) => value === mimeType);
  return entry ? entry[0] : "";
}

function parseDateTaken(dateTaken: string | null | undefined): Date | null {
  const value = dateTaken?.trim();
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
