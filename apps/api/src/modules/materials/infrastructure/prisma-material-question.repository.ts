import { Injectable } from "@nestjs/common";
import { QuestionType } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  MaterialQuestionInput,
  MaterialQuestionRecord,
  MaterialQuestionRepository,
  UpdateMaterialQuestionInput
} from "../application/ports/material-question.repository";

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
    questions: MaterialQuestionInput[]
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
            imageId: question.imageId,
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

  async listByMaterial(sourceMaterialId: string): Promise<MaterialQuestionRecord[]> {
    const rows = await this.prisma.question.findMany({
      where: { sourceMaterialId },
      include: { options: true },
      orderBy: { createdAt: "asc" }
    });
    return rows.map(toQuestionRecord);
  }

  async findByIdForMaterial(
    sourceMaterialId: string,
    questionId: string
  ): Promise<MaterialQuestionRecord | null> {
    const row = await this.prisma.question.findFirst({
      where: { id: questionId, sourceMaterialId },
      include: { options: true }
    });
    return row ? toQuestionRecord(row) : null;
  }

  async update(
    sourceMaterialId: string,
    questionId: string,
    input: UpdateMaterialQuestionInput
  ): Promise<MaterialQuestionRecord | null> {
    const existing = await this.prisma.question.findFirst({
      where: { id: questionId, sourceMaterialId },
      select: { id: true }
    });
    if (!existing) {
      return null;
    }

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.questionOption.deleteMany({ where: { questionId } });
      return tx.question.update({
        where: { id: questionId },
        data: {
          statement: input.statement,
          explanation: input.explanation,
          difficulty: input.difficulty,
          imageId: input.imageId,
          options: {
            create: input.options.map((option) => ({
              text: option.text,
              isCorrect: option.isCorrect
            }))
          }
        },
        include: { options: true }
      });
    });
    return toQuestionRecord(row);
  }

  async delete(sourceMaterialId: string, questionId: string): Promise<boolean> {
    const result = await this.prisma.question.deleteMany({
      where: { id: questionId, sourceMaterialId }
    });
    return result.count > 0;
  }
}

function toQuestionRecord(row: {
  id: string;
  sourceMaterialId: string | null;
  statement: string;
  explanation: string | null;
  difficulty: string;
  imageId: string | null;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
}): MaterialQuestionRecord {
  return {
    id: row.id,
    sourceMaterialId: row.sourceMaterialId,
    statement: row.statement,
    explanation: row.explanation,
    difficulty: row.difficulty,
    imageId: row.imageId,
    options: row.options.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect
    }))
  };
}