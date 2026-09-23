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

export abstract class MaterialQuestionRepository {
  abstract countByMaterials(sourceMaterialIds: string[]): Promise<Map<string, number>>;
  abstract replaceForMaterial(
    sourceMaterialId: string,
    questions: MaterialQuestionInput[]
  ): Promise<number>;
}
