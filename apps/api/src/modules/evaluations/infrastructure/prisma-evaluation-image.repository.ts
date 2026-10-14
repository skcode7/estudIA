import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  EvaluationImageRecord,
  EvaluationImageRepository,
  SaveEvaluationImageInput
} from "../application/ports/evaluation-image.repository";

@Injectable()
export class PrismaEvaluationImageRepository implements EvaluationImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByEvaluation(evaluationId: string): Promise<EvaluationImageRecord[]> {
    return this.prisma.evaluationImage.findMany({
      where: { evaluationId },
      orderBy: { order: "asc" }
    });
  }

  createMany(
    evaluationId: string,
    images: SaveEvaluationImageInput[]
  ): Promise<EvaluationImageRecord[]> {
    return this.prisma.$transaction(async (tx) => {
      const records: EvaluationImageRecord[] = [];
      for (const image of images) {
        records.push(
          await tx.evaluationImage.create({
            data: {
              evaluationId,
              storageKey: image.storageKey,
              label: image.label,
              order: image.order
            }
          })
        );
      }
      return records;
    });
  }

  findById(id: string): Promise<EvaluationImageRecord | null> {
    return this.prisma.evaluationImage.findUnique({ where: { id } });
  }
}
