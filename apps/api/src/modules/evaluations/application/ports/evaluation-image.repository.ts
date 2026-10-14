export interface EvaluationImageRecord {
  id: string;
  evaluationId: string;
  storageKey: string;
  /** Descripción breve de la foto ("Página 1"), para reconocerla en la interfaz. */
  label: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveEvaluationImageInput {
  storageKey: string;
  label: string;
  order: number;
}

export abstract class EvaluationImageRepository {
  abstract listByEvaluation(evaluationId: string): Promise<EvaluationImageRecord[]>;
  abstract createMany(
    evaluationId: string,
    images: SaveEvaluationImageInput[]
  ): Promise<EvaluationImageRecord[]>;
  abstract findById(id: string): Promise<EvaluationImageRecord | null>;
}
