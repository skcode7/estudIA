import { MaterialRecord } from "./material.repository";

export interface MaterialWithQuestionCount {
  material: MaterialRecord;
  questionCount: number;
}

export interface MaterialQuestionOptionInput {
  text: string;
  isCorrect: boolean;
}

export interface MaterialQuestionInput {
  statement: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  /** Imagen extraída del material que ilustra el enunciado (null si no tiene). */
  imageId: string | null;
  options: MaterialQuestionOptionInput[];
}

export interface MaterialQuestionOptionRecord {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MaterialQuestionRecord {
  id: string;
  sourceMaterialId: string | null;
  statement: string;
  explanation: string | null;
  difficulty: string;
  imageId: string | null;
  options: MaterialQuestionOptionRecord[];
}

export interface UpdateMaterialQuestionInput {
  statement: string;
  explanation: string | null;
  difficulty: string;
  imageId: string | null;
  options: MaterialQuestionOptionInput[];
}

export abstract class MaterialQuestionRepository {
  abstract countByMaterials(sourceMaterialIds: string[]): Promise<Map<string, number>>;
  abstract replaceForMaterial(
    sourceMaterialId: string,
    questions: MaterialQuestionInput[]
  ): Promise<number>;
  abstract listByMaterial(sourceMaterialId: string): Promise<MaterialQuestionRecord[]>;
  abstract findByIdForMaterial(
    sourceMaterialId: string,
    questionId: string
  ): Promise<MaterialQuestionRecord | null>;
  abstract update(
    sourceMaterialId: string,
    questionId: string,
    input: UpdateMaterialQuestionInput
  ): Promise<MaterialQuestionRecord | null>;
  abstract delete(sourceMaterialId: string, questionId: string): Promise<boolean>;
}
