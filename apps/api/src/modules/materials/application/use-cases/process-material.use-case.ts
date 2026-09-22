import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { AIProvider } from "../../../ai/application/ports/ai-provider";
import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import { MaterialQuestionRepository } from "../ports/material-question.repository";

const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp"
};

export interface ProcessMaterialResult {
  material: MaterialRecord;
  questionCount: number;
}

@Injectable()
export class ProcessMaterialUseCase {
  private readonly logger = new Logger(ProcessMaterialUseCase.name);

  constructor(
    private readonly repository: MaterialRepository,
    private readonly questionRepository: MaterialQuestionRepository,
    private readonly aiProvider: AIProvider,
    private readonly objectStorage: ObjectStorage
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

    const updatedFields: { title?: string; content?: string | null } = {};
    if (analysis.suggestedTitle) {
      updatedFields.title = analysis.suggestedTitle;
    }
    const extractedContent = analysis.extractedContent ?? content;
    if (extractedContent !== material.content) {
      updatedFields.content = extractedContent;
    }
    if (Object.keys(updatedFields).length > 0) {
      await this.repository.updateFields(materialId, updatedFields);
    }

    await this.saveAnalysis(materialId, material, analysis);

    let questionsCount: number;
    try {
      questionsCount = this.resolveQuestionsCount();
      const questions = await this.aiProvider.generateQuestions({
        title: updatedFields.title ?? material.title,
        content: extractedContent ?? "",
        analysis,
        count: questionsCount
      });
      questionsCount = await this.questionRepository.replaceForMaterial(materialId, questions);
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

  private resolveQuestionsCount(): number {
    const raw = process.env.AI_QUESTIONS_PER_MATERIAL ?? "3";
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
  }
}

function storageExtension(key: string): string {
  const dot = key.lastIndexOf(".");
  if (dot === -1) {
    return "";
  }
  return key.slice(dot).toLowerCase();
}