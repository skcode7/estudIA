import { GeneratedQuestion } from "../../../ai/application/ports/ai-provider";
import { MaterialRecord } from "./material.repository";

export interface MaterialWithQuestionCount {
  material: MaterialRecord;
  questionCount: number;
}

export abstract class MaterialQuestionRepository {
  abstract countByMaterials(sourceMaterialIds: string[]): Promise<Map<string, number>>;
  abstract replaceForMaterial(
    sourceMaterialId: string,
    questions: GeneratedQuestion[]
  ): Promise<number>;
}