import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { extname } from "node:path";

import { AIProvider, MaterialCatalogSubject } from "../../../ai/application/ports/ai-provider";
import { SubjectRecord, SubjectRepository } from "../../../subjects/application/ports/subject.repository";
import { TopicRecord, TopicRepository } from "../../../topics/application/ports/topic.repository";

const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp"
};

const SUPPORTED_IMAGE_MIME_TYPES = new Set(Object.values(SUPPORTED_IMAGE_TYPES));

export interface AnalyzeMaterialDraftInput {
  text?: string;
  image?: {
    mimeType: string;
    body: Buffer;
    originalName?: string;
  };
}

export interface AnalyzeMaterialDraftResult {
  suggestedSubjectId: string | null;
  suggestedTopicId: string | null;
  suggestedTitle: string | null;
  extractedContent: string | null;
}

@Injectable()
export class AnalyzeMaterialDraftUseCase {
  private readonly logger = new Logger(AnalyzeMaterialDraftUseCase.name);

  constructor(
    private readonly aiProvider: AIProvider,
    private readonly subjectRepository: SubjectRepository,
    private readonly topicRepository: TopicRepository
  ) {}

  async execute(input: AnalyzeMaterialDraftInput): Promise<AnalyzeMaterialDraftResult> {
    const text = input.text?.trim() ?? "";
    const image = input.image ? this.resolveImage(input.image) : null;

    if (!text && !image) {
      throw new BadRequestException(
        input.image
          ? "Este tipo de archivo no se puede analizar todavía. Por el momento solo se analizan imágenes (JPG, PNG, GIF, WebP)."
          : "Proporciona una foto, un archivo o un texto para analizar."
      );
    }

    const [subjects, topics] = await Promise.all([
      this.subjectRepository.findAll(),
      this.topicRepository.findAll()
    ]);

    let analysis;
    try {
      analysis = await this.aiProvider.analyzeMaterial({
        content: text,
        image,
        catalog: toCatalog(subjects, topics)
      });
    } catch (error) {
      this.logger.warn(`La IA no pudo analizar el borrador: ${String(error)}`);
      throw new ServiceUnavailableException(
        "La IA no pudo extraer la información. Intenta de nuevo."
      );
    }

    const { subjectId, topicId } = resolveSuggestedIds(
      analysis.suggestedSubjectId,
      analysis.suggestedTopicId,
      subjects,
      topics
    );

    return {
      suggestedSubjectId: subjectId,
      suggestedTopicId: topicId,
      suggestedTitle: analysis.suggestedTitle ?? null,
      extractedContent: analysis.extractedContent?.trim() ?? null
    };
  }

  private resolveImage(image: {
    mimeType: string;
    body: Buffer;
    originalName?: string;
  }): { mimeType: string; body: Buffer } {
    const extension = extname(image.originalName ?? "").toLowerCase();
    const mimeType = SUPPORTED_IMAGE_TYPES[extension] ?? image.mimeType;
    if (!SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        "Este tipo de archivo no se puede analizar todavía. Por el momento solo se analizan imágenes (JPG, PNG, GIF, WebP)."
      );
    }
    return { mimeType, body: image.body };
  }
}

function toCatalog(
  subjects: SubjectRecord[],
  topics: TopicRecord[]
): MaterialCatalogSubject[] {
  return subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    topics: topics
      .filter((topic) => topic.subjectId === subject.id)
      .map((topic) => ({ id: topic.id, name: topic.name }))
  }));
}

function resolveSuggestedIds(
  suggestedSubjectId: string | null | undefined,
  suggestedTopicId: string | null | undefined,
  subjects: SubjectRecord[],
  topics: TopicRecord[]
): { subjectId: string | null; topicId: string | null } {
  const topic = suggestedTopicId
    ? topics.find((item) => item.id === suggestedTopicId)
    : undefined;

  let subjectId: string | null = null;
  if (suggestedSubjectId && subjects.some((item) => item.id === suggestedSubjectId)) {
    subjectId = suggestedSubjectId;
  }

  if (!topic) {
    return { subjectId, topicId: null };
  }

  return {
    subjectId: subjectId && subjectId === topic.subjectId ? subjectId : topic.subjectId,
    topicId: topic.id
  };
}
