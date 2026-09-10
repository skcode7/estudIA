export interface SubjectRecord {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubjectInput {
  name: string;
  description?: string | null;
}

export interface UpdateSubjectInput {
  name?: string;
  description?: string | null;
}

export abstract class SubjectRepository {
  abstract create(input: CreateSubjectInput): Promise<SubjectRecord>;
  abstract findAll(): Promise<SubjectRecord[]>;
  abstract findById(id: string): Promise<SubjectRecord | null>;
  abstract update(id: string, input: UpdateSubjectInput): Promise<SubjectRecord>;
  abstract delete(id: string): Promise<void>;
}