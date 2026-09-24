import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import {
  AIProvider,
  GeneratedQuestion,
  MaterialImageHint
} from "../../../ai/application/ports/ai-provider";
import {
  ExtractedImageRegion,
  ImageRegionBox,
  MaterialImageExtractor
} from "../../../ai/application/ports/image-extractor";
import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { ImageCropper } from "../ports/image-cropper";
import { MaterialImageRepository } from "../ports/material-image.repository";
import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import {
  MaterialQuestionInput,
  MaterialQuestionRepository
} from "../ports/material-question.repository";

const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp"
};

const MAX_EXTRACTED_IMAGES = 5;
const IMAGE_BOX_PADDING_RATIO = 0.08;

export interface ProcessMaterialResult {
  material: MaterialRecord;
  questionCount: number;
}

export const PROCESS_MATERIAL_CONFIG = "PROCESS_MATERIAL_CONFIG";

export interface ProcessMaterialConfig {
  questionsCount: number;
}

interface ExtractedImages {
  hints: MaterialImageHint[];
  imageIdByIndex: Map<number, string>;
}

@Injectable()
export class ProcessMaterialUseCase {
  private readonly logger = new Logger(ProcessMaterialUseCase.name);

  constructor(
    private readonly repository: MaterialRepository,
    private readonly questionRepository: MaterialQuestionRepository,
    private readonly aiProvider: AIProvider,
    private readonly objectStorage: ObjectStorage,
    @Inject(PROCESS_MATERIAL_CONFIG) private readonly config: ProcessMaterialConfig,
    private readonly imageExtractor: MaterialImageExtractor,
    private readonly imageCropper: ImageCropper,
    private readonly imageRepository: MaterialImageRepository
  ) {}

  async execute(materialId: string): Promise<ProcessMaterialResult> {
    const material = await this.repository.findById(materialId);
    if (!material) {
      throw new NotFoundException(`Material con id "${materialId}" no encontrado.`);
    }

    await this.repository.updateProcessingStatus(materialId, "PROCESSING", null);

    let image: { mimeType: string; body: Buffer } | null = null;
    let content: string | null = material.content;

    if (material.type === "TEXT") {
      if (!content) {
        return this.fail(materialId, "El material de texto no tiene contenido para analizar.");
      }
    } else if (material.type === "FILE") {
      const extraction = await this.loadFileMaterial(materialId, material);
      if ("error" in extraction) {
        return this.fail(materialId, extraction.error);
      }
      image = extraction.image;
      content = extraction.content;
    } else {
      return this.fail(materialId, "El tipo de material no es procesable con IA.");
    }

    let analysis;
    try {
      analysis = await this.aiProvider.analyzeMaterial({
        title: material.title,
        content: content ?? "",
        image
      });
    } catch (error) {
      return this.fail(materialId, this.providerError("analizar el material", error));
    }

    const updatedFields: {
      title?: string;
      content?: string | null;
      hasEmbeddedFigures?: boolean;
    } = {};
    if (analysis.suggestedTitle) {
      updatedFields.title = analysis.suggestedTitle;
    }
    const extractedContent = analysis.extractedContent ?? content;
    if (extractedContent !== material.content) {
      updatedFields.content = extractedContent;
    }
    const hasEmbeddedFigures = material.hasEmbeddedFigures || (analysis.hasEmbeddedFigures ?? false);
    if (hasEmbeddedFigures !== material.hasEmbeddedFigures) {
      updatedFields.hasEmbeddedFigures = hasEmbeddedFigures;
    }
    if (Object.keys(updatedFields).length > 0) {
      await this.repository.updateFields(materialId, updatedFields);
    }

    await this.saveAnalysis(materialId, material, analysis);

    const extractedImages = await this.extractEmbeddedImages(material, image, hasEmbeddedFigures);

    let questionsCount: number;
    try {
      questionsCount = this.config.questionsCount;
      const questions = await this.aiProvider.generateQuestions({
        title: updatedFields.title ?? material.title,
        content: extractedContent ?? "",
        analysis,
        count: questionsCount,
        ...(extractedImages.hints.length > 0 ? { images: extractedImages.hints } : {})
      });
      questionsCount = await this.questionRepository.replaceForMaterial(
        materialId,
        toQuestionInputs(questions, extractedImages.imageIdByIndex)
      );
    } catch (error) {
      return this.fail(materialId, this.providerError("generar preguntas", error));
    }

    const processed = await this.repository.updateProcessingStatus(materialId, "COMPLETED", null);
    return { material: processed, questionCount: questionsCount };
  }

  private async loadFileMaterial(
    materialId: string,
    material: MaterialRecord
  ): Promise<{ image: { mimeType: string; body: Buffer } | null; content: null } | { error: string }> {
    if (!material.storageKey) {
      return { error: "El archivo no tiene clave de almacenamiento." };
    }

    let body: Buffer;
    try {
      body = await this.objectStorage.getObject(material.storageKey);
    } catch {
      return { error: "No se pudo leer el archivo del almacenamiento." };
    }

    const extension = storageExtension(material.storageKey);
    const mimeType = SUPPORTED_IMAGE_TYPES[extension];
    if (!mimeType) {
      return {
        error:
          "Este tipo de archivo no se puede procesar todavía. Por el momento solo se procesan imágenes (JPG, PNG, GIF, WebP)."
      };
    }

    return { image: { mimeType, body }, content: null };
  }

  /**
   * Descompone la foto de los apuntes en figuras embebidas (banderas, mapas,
   * diagramas…), las recorta, las sube al almacenamiento y las persiste como
   * MaterialImage. Cualquier fallo degrada a cero imágenes sin romper el
   * procesamiento del material.
   */
  private async extractEmbeddedImages(
    material: MaterialRecord,
    image: { mimeType: string; body: Buffer } | null,
    hasEmbeddedFigures: boolean
  ): Promise<ExtractedImages> {
    const empty: ExtractedImages = { hints: [], imageIdByIndex: new Map() };
    if (!image || !hasEmbeddedFigures) {
      return empty;
    }
    if (!this.imageExtractor.isAvailable()) {
      this.logger.warn(
        `El material "${material.id}" parece contener figuras, pero no hay extractor de imágenes configurado (OPENROUTER_API_KEY).`
      );
      return empty;
    }

    let regions: ExtractedImageRegion[];
    try {
      regions = await this.imageExtractor.extractRegions({
        image,
        maxRegions: MAX_EXTRACTED_IMAGES
      });
    } catch (error) {
      this.logger.warn(
        `No se pudieron extraer las figuras del material "${material.id}": ${String(error)}`
      );
      return empty;
    }
    if (regions.length === 0) {
      return empty;
    }

    const previousImages = await this.imageRepository.listByMaterial(material.id);

    const saved: { storageKey: string; label: string; order: number }[] = [];
    for (const [index, region] of regions.slice(0, MAX_EXTRACTED_IMAGES).entries()) {
      const stored = await this.cropAndStoreRegion(material, image, index, region);
      if (stored) {
        saved.push(stored);
      }
    }
    if (saved.length === 0) {
      return empty;
    }

    const records = await this.imageRepository.replaceForMaterial(material.id, saved);
    const imageIdByIndex = new Map(records.map((record) => [record.order, record.id]));

    await this.cleanupStaleImages(
      previousImages,
      new Set(saved.map((image_) => image_.storageKey))
    );

    return {
      hints: saved
        .filter((image_) => imageIdByIndex.has(image_.order))
        .map((image_) => ({ index: image_.order, label: image_.label })),
      imageIdByIndex
    };
  }

  private async cropAndStoreRegion(
    material: MaterialRecord,
    image: { mimeType: string; body: Buffer },
    index: number,
    region: ExtractedImageRegion
  ): Promise<{ storageKey: string; label: string; order: number } | null> {
    try {
      const body = await this.imageCropper.cropToWebp({
        image,
        box: padBox(region.box, IMAGE_BOX_PADDING_RATIO)
      });
      const key = `topics/${material.topicId}/materials/${material.id}/images/${randomUUID()}.webp`;
      await this.objectStorage.upload({ key, body, contentType: "image/webp" });
      return { storageKey: key, label: region.label, order: index };
    } catch (error) {
      this.logger.warn(
        `No se pudo recortar la figura "${region.label}" del material "${material.id}": ${String(error)}`
      );
      return null;
    }
  }

  private async cleanupStaleImages(
    previousImages: { storageKey: string }[],
    keptKeys: Set<string>
  ): Promise<void> {
    for (const previous of previousImages) {
      if (keptKeys.has(previous.storageKey)) {
        continue;
      }
      try {
        await this.objectStorage.delete(previous.storageKey);
      } catch (error) {
        this.logger.warn(
          `No se pudo eliminar la imagen previa "${previous.storageKey}" del almacenamiento: ${String(error)}`
        );
      }
    }
  }

  private async saveAnalysis(
    materialId: string,
    material: MaterialRecord,
    analysis: unknown
  ): Promise<void> {
    const key = `topics/${material.topicId}/materials/${materialId}/analysis.json`;
    try {
      await this.objectStorage.upload({
        key,
        body: Buffer.from(JSON.stringify(analysis)),
        contentType: "application/json"
      });
    } catch (error) {
      this.logger.warn(`No se pudo guardar el análisis de "${materialId}": ${String(error)}`);
    }
  }

  private async fail(materialId: string, message: string): Promise<ProcessMaterialResult> {
    const material = await this.repository.updateProcessingStatus(materialId, "FAILED", message);
    return { material, questionCount: 0 };
  }

  private providerError(step: string, error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return `Error del proveedor de IA al ${step}: ${message}`;
  }
}

function toQuestionInputs(
  questions: GeneratedQuestion[],
  imageIdByIndex: Map<number, string>
): MaterialQuestionInput[] {
  return questions.map((question) => ({
    statement: question.statement,
    explanation: question.explanation,
    difficulty: question.difficulty,
    imageId:
      question.imageIndex !== undefined ? imageIdByIndex.get(question.imageIndex) ?? null : null,
    options: question.options.map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect
    }))
  }));
}

function padBox(box: ImageRegionBox, ratio: number): ImageRegionBox {
  const padX = box.width * ratio;
  const padY = box.height * ratio;
  const x = Math.max(0, box.x - padX);
  const y = Math.max(0, box.y - padY);
  return {
    x,
    y,
    width: Math.min(1 - x, box.width + padX * 2),
    height: Math.min(1 - y, box.height + padY * 2)
  };
}

function storageExtension(key: string): string {
  const dot = key.lastIndexOf(".");
  if (dot === -1) {
    return "";
  }
  return key.slice(dot).toLowerCase();
}
