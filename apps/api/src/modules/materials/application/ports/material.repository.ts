export type MaterialType = "TEXT" | "FILE" | "LINK";

export type MaterialProcessingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface MaterialRecord {
  id: string;
  topicId: string;
  type: MaterialType;
  title: string;
  content: string | null;
  storageKey: string | null;
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
}

export abstract class MaterialRepository {
  abstract create(input: CreateMaterialInput): Promise<MaterialRecord>;
  abstract findByTopic(topicId: string): Promise<MaterialRecord[]>;
  abstract findById(id: string): Promise<MaterialRecord | null>;
  abstract delete(id: string): Promise<void>;
}