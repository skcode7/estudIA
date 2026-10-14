import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

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

export interface AnalyzeEvaluationDraftImage {
  mimeType: string;
  body: Buffer;
  originalName?: string;
}

export interface AnalyzeEvaluationDraftResult {
  suggestedSubjectId: string | null;
  suggestedTopicId: string | null;
  suggestedTitle: string | null;
}

/**
 * Clasifica las fotos de una evaluación (materia, tema y título) antes de
 * guardarla, para que el usuario solo tenga que confirmar lo que propone la IA.
 */
@Injectable()
export class AnalyzeEvaluationDraftUseCase {
  private readonly logger = new Logger(AnalyzeEvaluationDraftUseCase.name);

  constructor(
    private readonly aiProvider: AIProvider,
    private readonly subjectRepository: SubjectRepository,
    private readonly topicRepository: TopicRepository
  ) {}

  async execute(input: {
    images: AnalyzeEvaluationDraftImage[];
    /** Limita la propuesta a los temas de una materia ya elegida. */
    subjectId?: string | null;
  }): Promise<AnalyzeEvaluationDraftResult> {
    if (input.images.length === 0) {
      throw new BadRequestException("Selecciona al menos una foto de la evaluación.");
    }

    const images = input.images.map((image) => this.resolveImage(image));
    const [subjects, topics] = await Promise.all([
      this.subjectRepository.findAll(),
      this.topicRepository.findAll(input.subjectId ? { subjectId: input.subjectId } : undefined)
    ]);

    let draft;
    try {
      draft = await this.aiProvider.analyzeEvaluationDraft({
        images,
        catalog: toCatalog(subjects, topics)
      });
    } catch (error) {
      this.logger.warn(`La IA no pudo clasificar la evaluación: ${String(error)}`);
      throw new ServiceUnavailableException(
        "La IA no pudo clasificar la evaluación. Intenta de nuevo."
      );
    }

    const { subjectId, topicId } = resolveSuggestedIds(
      draft.suggestedSubjectId,
      draft.suggestedTopicId,
      subjects,
      topics
    );

    return {
      suggestedSubjectId: subjectId,
      suggestedTopicId: topicId,
      suggestedTitle: draft.suggestedTitle?.trim() || null
    };
  }

  private resolveImage(image: AnalyzeEvaluationDraftImage): { mimeType: string; body: Buffer } {
    const extension = (image.originalName ?? "").split(".").pop()?.toLowerCase();
    const mimeType = (extension && SUPPORTED_IMAGE_TYPES[`.${extension}`]) ?? image.mimeType;
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
