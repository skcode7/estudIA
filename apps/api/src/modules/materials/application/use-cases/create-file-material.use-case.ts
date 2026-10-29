import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";

import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import {
  CreateMaterialInput,
  MaterialQuestionMode,
  MaterialRecord,
  MaterialRepository
} from "../ports/material.repository";
import { MaterialImageRepository, SaveMaterialImageInput } from "../ports/material-image.repository";

export interface CreateFileMaterialImageInput {
  originalName: string;
  contentType: string;
  body: Buffer;
}

export interface CreateFileMaterialInput {
  topicId: string;
  files?: CreateFileMaterialImageInput[];
  // Compatibilidad con el contrato anterior (un solo archivo).
  title?: string;
  originalName?: string;
  contentType?: string;
  body?: Buffer;
  /** Contenido en texto del material (transcripción extraída o editada por el usuario). */
  content?: string | null;
  /** Marca si la foto contiene figuras propias (según el análisis del borrador). */
  hasEmbeddedFigures?: boolean;
  /** Modo de generación de preguntas para este material. */
  questionMode?: MaterialQuestionMode;
}

@Injectable()
export class CreateFileMaterialUseCase {
  private readonly logger = new Logger(CreateFileMaterialUseCase.name);

  constructor(
    private readonly repository: MaterialRepository,
    private readonly topicRepository: TopicRepository,
    private readonly objectStorage: ObjectStorage,
    private readonly imageRepository: MaterialImageRepository
  ) {}

  async execute(input: CreateFileMaterialInput): Promise<MaterialRecord> {
    const files =
      input.files && input.files.length > 0
        ? input.files
        : input.originalName && input.contentType && input.body
          ? [{ originalName: input.originalName, contentType: input.contentType, body: input.body }]
          : [];

    if (files.length === 0) {
      throw new Error("Se requiere al menos un archivo.");
    }

    const topic = await this.topicRepository.findById(input.topicId);
    if (!topic) {
      throw new NotFoundException(`Tema con id "${input.topicId}" no encontrado.`);
    }

    const uploaded: { key: string; label: string }[] = [];
    for (const file of files) {
      const extension = (extname(file.originalName) || detectExtension(file.contentType)).toLowerCase();
      const key = `topics/${input.topicId}/materials/${randomUUID()}${extension}`;

      let stored: Awaited<ReturnType<ObjectStorage["upload"]>>;
      try {
        stored = await this.objectStorage.upload({
          key,
          body: file.body,
          contentType: file.contentType
        });
      } catch (error) {
        const bucket = process.env.S3_BUCKET ?? "estudia-materials";
        this.logger.error(
          `Fallo al subir el archivo al almacenamiento (key=${key}, bucket=${bucket}): ${
            error instanceof Error ? error.message : String(error)
          }`,
          error instanceof Error ? error.stack : undefined
        );
        throw new ServiceUnavailableException("No se pudo almacenar el archivo. Intenta de nuevo.");
      }
      uploaded.push({ key: stored.key, label: file.originalName });
    }

    const title = input.title?.trim() || files[0]!.originalName;

    const createInput: CreateMaterialInput = {
      topicId: input.topicId,
      type: "FILE",
      title,
      content: input.content?.trim() || null,
      storageKey: uploaded[0]!.key,
      hasEmbeddedFigures: input.hasEmbeddedFigures ?? false,
      questionMode: input.questionMode ?? ("BASED_ON_MATERIAL" as MaterialQuestionMode)
    };
    const material = await this.repository.create(createInput);

    const images: SaveMaterialImageInput[] = uploaded.map((file, index) => ({
      storageKey: file.key,
      label: file.label,
      order: index
    }));
    await this.imageRepository.replaceForMaterial(material.id, images);

    return material;
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
