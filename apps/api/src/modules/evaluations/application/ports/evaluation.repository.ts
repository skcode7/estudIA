export type EvaluationProcessingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface EvaluationRecord {
  id: string;
  topicId: string;
  title: string;
  /** Fecha en la que se realizó la evaluación (null si el usuario no la indicó). */
  dateTaken: Date | null;
  processingStatus: EvaluationProcessingStatus;
  processingError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEvaluationInput {
  id: string;
  topicId: string;
  title: string;
  dateTaken?: Date | null;
}

export interface EvaluationWithCounts {
  evaluation: EvaluationRecord;
  /** Preguntas extraídas que hoy forman parte del pool. */
  questionCount: number;
  /** Fotos que respaldan la evaluación. */
  imageCount: number;
}

export abstract class EvaluationRepository {
  abstract create(input: CreateEvaluationInput): Promise<EvaluationRecord>;
  abstract findByTopicIds(topicIds: string[]): Promise<EvaluationRecord[]>;
  abstract findById(id: string): Promise<EvaluationRecord | null>;
  abstract updateProcessingStatus(
    id: string,
    status: EvaluationProcessingStatus,
    processingError?: string | null
  ): Promise<EvaluationRecord>;
  abstract delete(id: string): Promise<void>;
}
