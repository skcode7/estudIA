export type MaterialType = "TEXT" | "FILE" | "LINK";

export type MaterialProcessingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface MaterialRecord {
  id: string;
  topicId: string;
  type: MaterialType;
  title: string;
  content: string | null;
  storageKey: string | null;
  /** Marca si el material contiene figuras propias además del texto (para procesarlas después). */
  hasEmbeddedFigures: boolean;
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