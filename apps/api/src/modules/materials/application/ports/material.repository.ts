export type MaterialType = "TEXT" | "FILE" | "LINK";

export type MaterialProcessingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

/**
 * Cómo se generan las preguntas a partir del material:
 * - BASED_ON_MATERIAL: preguntas sobre el contenido cargado (comportamiento actual).
 * - SIMILAR_QUESTIONS: el material es una guía de ejercicios; se generan preguntas
 *   nuevas con la misma estructura y mecánica, pero datos distintos.
 */
export type MaterialQuestionMode = "BASED_ON_MATERIAL" | "SIMILAR_QUESTIONS";

export const DEFAULT_MATERIAL_QUESTION_MODE: MaterialQuestionMode = "BASED_ON_MATERIAL";

export interface MaterialRecord {
  id: string;
  topicId: string;
  type: MaterialType;
  title: string;
  content: string | null;
  storageKey: string | null;
  /** Marca si el material contiene figuras propias además del texto (para procesarlas después). */
  hasEmbeddedFigures: boolean;
  /** Modo de generación de preguntas para este material. */
  questionMode: MaterialQuestionMode;
  processingStatus: MaterialProcessingStatus;
  processingError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMaterialInput {
  topicId: string;
  type: MaterialType;
  title: string;
  content?: string | null;
  storageKey?: string | null;
  hasEmbeddedFigures?: boolean;
  questionMode?: MaterialQuestionMode;
}

export interface UpdateMaterialFieldsInput {
  title?: string;
  content?: string | null;
  hasEmbeddedFigures?: boolean;
}

export abstract class MaterialRepository {
  abstract create(input: CreateMaterialInput): Promise<MaterialRecord>;
  abstract findByTopic(topicId: string): Promise<MaterialRecord[]>;
  abstract findById(id: string): Promise<MaterialRecord | null>;
  abstract updateProcessingStatus(
    id: string,
    status: MaterialProcessingStatus,
    processingError?: string | null
  ): Promise<MaterialRecord>;
  abstract updateFields(id: string, fields: UpdateMaterialFieldsInput): Promise<MaterialRecord>;
  abstract delete(id: string): Promise<void>;
}