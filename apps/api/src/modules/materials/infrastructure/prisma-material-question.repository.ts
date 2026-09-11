import { Injectable } from "@nestjs/common";
import { QuestionType } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { GeneratedQuestion } from "../../ai/application/ports/ai-provider";
import { MaterialQuestionRepository } from "../application/ports/material-question.repository";

@Injectable()
export class PrismaMaterialQuestionRepository implements MaterialQuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countByMaterials(sourceMaterialIds: string[]): Promise<Map<string, number>> {
    if (sourceMaterialIds.length === 0) {
      return new Map();
    }
    const groups = await this.prisma.question.groupBy({
      by: ["sourceMaterialId"],
      where: { sourceMaterialId: { in: sourceMaterialIds } },
      _count: { _all: true }
    });
    const counts = new Map<string, number>();
    for (const group of groups) {
      if (group.sourceMaterialId) {
        counts.set(group.sourceMaterialId, group._count._all);
      }
    }
    return counts;
  }

  async replaceForMaterial(
    sourceMaterialId: string,
    questions: GeneratedQuestion[]
  ): Promise<number> {
    const material = await this.prisma.material.findUnique({
      where: { id: sourceMaterialId },
      select: { topicId: true }
    });
    if (!material) {
      return 0;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({ where: { sourceMaterialId } });
      let count = 0;
      for (const question of questions) {
        await tx.question.create({
          data: {
            topicId: material.topicId,
            type: "MULTIPLE_CHOICE" as QuestionType,
            statement: question.statement,
            explanation: question.explanation ?? null,
            difficulty: question.difficulty,
            sourceMaterialId,
            options: {
              create: question.options.map((option) => ({
                text: option.text,
                isCorrect: option.isCorrect
              }))
            }
          }
        });
        count += 1;
      }
      return count;
    });
  }
}