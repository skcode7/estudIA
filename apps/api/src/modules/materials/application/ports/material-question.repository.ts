import { GeneratedQuestion } from "../../../ai/application/ports/ai-provider";

export abstract class MaterialQuestionRepository {
  abstract countByMaterials(sourceMaterialIds: string[]): Promise<Map<string, number>>;
  abstract replaceForMaterial(
    sourceMaterialId: string,
    questions: GeneratedQuestion[]
  ): Promise<number>;
}