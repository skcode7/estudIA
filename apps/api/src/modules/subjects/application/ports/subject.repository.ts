export const SUBJECT_COLORS = ["emerald", "blue", "orange", "violet"] as const;
export type SubjectColor = (typeof SUBJECT_COLORS)[number];

export const SUBJECT_ICONS = [
  "subjects",
  "quiz",
  "progress",
  "badges",
  "graduate",
  "text",
  "image",
  "link",
  "sparkle",
  "goal",
  "question",
  "camera"
] as const;
export type SubjectIcon = (typeof SUBJECT_ICONS)[number];

export interface SubjectRecord {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  materialsCount: number;
  /** Promedio simple de los `score` de los intentos completados. `null` si la materia aún no tiene intentos. */
  progress: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubjectInput {
  name: string;
  description?: string | null;
  color?: string;
  icon?: string;
}

export interface UpdateSubjectInput {
  name?: string;
  description?: string | null;
  color?: string;
  icon?: string;
}

export abstract class SubjectRepository {
  abstract create(input: CreateSubjectInput): Promise<SubjectRecord>;
  abstract findAll(): Promise<SubjectRecord[]>;
  abstract findById(id: string): Promise<SubjectRecord | null>;
  abstract update(id: string, input: UpdateSubjectInput): Promise<SubjectRecord>;
  abstract delete(id: string): Promise<void>;
}
