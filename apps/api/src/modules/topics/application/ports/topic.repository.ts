export interface TopicRecord {
  id: string;
  subjectId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTopicInput {
  subjectId: string;
  name: string;
  description?: string | null;
}

export interface UpdateTopicInput {
  name?: string;
  description?: string | null;
}

export interface ListTopicsOptions {
  subjectId?: string;
}

export abstract class TopicRepository {
  abstract create(input: CreateTopicInput): Promise<TopicRecord>;
  abstract findAll(options?: ListTopicsOptions): Promise<TopicRecord[]>;
  abstract findById(id: string): Promise<TopicRecord | null>;
  abstract update(id: string, input: UpdateTopicInput): Promise<TopicRecord>;
  abstract delete(id: string): Promise<void>;
}