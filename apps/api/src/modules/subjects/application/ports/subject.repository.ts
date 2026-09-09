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

export abstract class SubjectRepository {
  abstract create(input: CreateSubjectInput): Promise<SubjectRecord>;
  abstract findAll(): Promise<SubjectRecord[]>;
}