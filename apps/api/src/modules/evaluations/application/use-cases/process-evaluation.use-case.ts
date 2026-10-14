import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { AIProvider, ExtractedEvaluationQuestion } from "../../../ai/application/ports/ai-provider";
import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { SubjectRepository } from "../../../subjects/application/ports/subject.repository";
import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import { EvaluationImageRepository } from "../ports/evaluation-image.repository";
import {
  EvaluationQuestionInput,
  EvaluationQuestionRepository
} from "../ports/evaluation-question.repository";
import { EvaluationRecord, EvaluationRepository } from "../ports/evaluation.repository";

export interface ProcessEvaluationResult {
  evaluation: EvaluationRecord;
  questionCount: number;
}

interface LoadedEvaluationImage {
  id: string;
  mimeType: string;
  body: Buffer;
}

@Injectable()
export class ProcessEvaluationUseCase {
  private readonly logger = new Logger(ProcessEvaluationUseCase.name);

  constructor(
    private readonly repository: EvaluationRepository,
    private readonly imageRepository: EvaluationImageRepository,
    private readonly questionRepository: EvaluationQuestionRepository,
    private readonly aiProvider: AIProvider,
    private readonly topicRepository: TopicRepository,
    private readonly subjectRepository: SubjectRepository,
    private readonly objectStorage: ObjectStorage
  ) {}

  async execute(evaluationId: string): Promise<ProcessEvaluationResult> {
    const evaluation = await this.repository.findById(evaluationId);
    if (!evaluation) {
      throw new NotFoundException(`Evaluación con id "${evaluationId}" no encontrada.`);
    }

    await this.repository.updateProcessingStatus(evaluationId, "PROCESSING", null);

    const images = await this.imageRepository.listByEvaluation(evaluationId);
    if (images.length === 0) {
      return this.fail(evaluationId, "La evaluación no tiene fotos que leer.");
    }

    // El tema lo eligió el usuario al subirla: es el destino de todas las
    // preguntas extraídas, y la materia solo da contexto al modelo.
    const topic = await this.topicRepository.findById(evaluation.topicId);
    if (!topic) {
      return this.fail(evaluationId, "El tema de la evaluación ya no existe.");
    }
    const subject = await this.subjectRepository.findById(topic.subjectId);
    if (!subject) {
      return this.fail(evaluationId, "La materia del tema ya no existe.");
    }

    const loaded = await this.loadImages(evaluationId, images);
    if (loaded.length === 0) {
      return this.fail(evaluationId, "No se pudo leer ninguna foto de la evaluación.");
    }

    let extracted: ExtractedEvaluationQuestion[];
    try {
      extracted = await this.aiProvider.extractEvaluationQuestions({
        subjectName: subject.name,
        title: evaluation.title,
        images: loaded.map((image) => ({ mimeType: image.mimeType, body: image.body }))
      });
    } catch (error) {
      return this.fail(evaluationId, this.providerError(error));
    }

    // `imageIndex` es la posición dentro del array enviado al modelo, que es
    // `loaded`: se traduce a la foto real aunque alguna no se haya podido leer.
    const imageIdByIndex = new Map(loaded.map((image, index) => [index, image.id]));
    const inputs = toQuestionInputs(extracted, topic.id, imageIdByIndex);

    let questionCount: number;
    try {
      questionCount = await this.questionRepository.replaceForEvaluation(evaluationId, inputs);
    } catch (error) {
      return this.fail(evaluationId, `No se pudieron guardar las preguntas: ${String(error)}`);
    }

    const processed = await this.repository.updateProcessingStatus(
      evaluationId,
      "COMPLETED",
      null
    );
    return { evaluation: processed, questionCount };
  }

  /**
   * Las fotos van al modelo en el mismo orden en que se subieron, y ese es el
   * orden que usa `imageIndex` para decir de qué foto sale cada pregunta.
   */
  private async loadImages(
    evaluationId: string,
    images: { id: string; storageKey: string; order: number }[]
  ): Promise<LoadedEvaluationImage[]> {
    const loaded: LoadedEvaluationImage[] = [];
    for (const image of images) {
      try {
        const body = await this.objectStorage.getObject(image.storageKey);
        loaded.push({ id: image.id, mimeType: mimeTypeOf(image.storageKey), body });
      } catch (error) {
        this.logger.warn(
          `No se pudo leer la foto "${image.storageKey}" de la evaluación "${evaluationId}": ${String(error)}`
        );
      }
    }
    return loaded;
  }

  private async fail(evaluationId: string, message: string): Promise<ProcessEvaluationResult> {
    const evaluation = await this.repository.updateProcessingStatus(
      evaluationId,
      "FAILED",
      message
    );
    return { evaluation, questionCount: 0 };
  }

  private providerError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return `Error del proveedor de IA al extraer las preguntas: ${message}`;
  }
}

function toQuestionInputs(
  extracted: ExtractedEvaluationQuestion[],
  topicId: string,
  imageIdByIndex: Map<number, string>
): EvaluationQuestionInput[] {
  return extracted.map((question) => ({
    topicId,
    type: question.type,
    statement: question.statement,
    explanation: question.explanation,
    difficulty: question.difficulty,
    evaluationImageId:
      question.imageIndex !== undefined ? (imageIdByIndex.get(question.imageIndex) ?? null) : null,
    options: question.options.map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect
    }))
  }));
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
