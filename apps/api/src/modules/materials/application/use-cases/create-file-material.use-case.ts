import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import {
  CreateMaterialInput,
  MaterialRecord,
  MaterialRepository
} from "../ports/material.repository";

export interface CreateFileMaterialInput {
  topicId: string;
  title: string;
  originalName: string;
  contentType: string;
  body: Buffer;
  /** Contenido en texto del material (transcripción extraída o editada por el usuario). */
  content?: string | null;
  /** Marca si la foto contiene figuras propias (según el análisis del borrador). */
  hasEmbeddedFigures?: boolean;
}

@Injectable()
export class CreateFileMaterialUseCase {
  constructor(
    private readonly repository: MaterialRepository,
    private readonly topicRepository: TopicRepository,
    private readonly objectStorage: ObjectStorage
  ) {}

  async execute(input: CreateFileMaterialInput): Promise<MaterialRecord> {
    const topic = await this.topicRepository.findById(input.topicId);
    if (!topic) {
      throw new NotFoundException(`Tema con id "${input.topicId}" no encontrado.`);
    }

    const extension = (extname(input.originalName) || detectExtension(input.contentType)).toLowerCase();
    const key = `topics/${input.topicId}/materials/${randomUUID()}${extension}`;

    let stored: Awaited<ReturnType<ObjectStorage["upload"]>>;
    try {
      stored = await this.objectStorage.upload({
        key,
        body: input.body,
        contentType: input.contentType
      });
    } catch {
      throw new ServiceUnavailableException("No se pudo almacenar el archivo. Intenta de nuevo.");
    }

    const createInput: CreateMaterialInput = {
      topicId: input.topicId,
      type: "FILE",
      title: input.title,
      content: input.content?.trim() || null,
      storageKey: stored.key,
      hasEmbeddedFigures: input.hasEmbeddedFigures ?? false
    };
    return this.repository.create(createInput);
  }
}

function detectExtension(contentType: string): string {
  const byType: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "text/plain": ".txt"
  };
  return byType[contentType] ?? "";
}