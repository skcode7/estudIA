import { Injectable } from "@nestjs/common";
import { QuestionType } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  EvaluationQuestionInput,
  EvaluationQuestionRecord,
  EvaluationQuestionRepository,
  EvaluationQuestionType,
  UpdateEvaluationQuestionInput
} from "../application/ports/evaluation-question.repository";

@Injectable()
export class PrismaEvaluationQuestionRepository implements EvaluationQuestionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countByEvaluations(sourceEvaluationIds: string[]): Promise<Map<string, number>> {
    if (sourceEvaluationIds.length === 0) {
      return new Map();
    }
    const groups = await this.prisma.question.groupBy({
      by: ["sourceEvaluationId"],
      where: { sourceEvaluationId: { in: sourceEvaluationIds } },
      _count: { _all: true }
    });
    const counts = new Map<string, number>();
    for (const group of groups) {
      if (group.sourceEvaluationId) {
        counts.set(group.sourceEvaluationId, group._count._all);
      }
    }
    return counts;
  }

  /**
   * Cada pregunta trae su propio `topicId` resuelto, así que aquí no se puede
   * heredar el de la evaluación como hace el material: se crea una por una.
   */
  async replaceForEvaluation(
    sourceEvaluationId: string,
    questions: EvaluationQuestionInput[]
  ): Promise<number> {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: sourceEvaluationId },
      select: { id: true }
    });
    if (!evaluation) {
      return 0;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({ where: { sourceEvaluationId } });
      let count = 0;
      for (const question of questions) {
        await tx.question.create({
          data: {
            topicId: question.topicId,
            type: question.type as QuestionType,
            statement: question.statement,
            explanation: question.explanation ?? null,
            difficulty: question.difficulty,
            sourceEvaluationId,
            evaluationImageId: question.evaluationImageId,
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

  async listByEvaluation(sourceEvaluationId: string): Promise<EvaluationQuestionRecord[]> {
    const rows = await this.prisma.question.findMany({
      where: { sourceEvaluationId },
      include: { options: true },
      orderBy: { createdAt: "asc" }
    });
    return rows.map(toQuestionRecord);
  }

  async findByIdForEvaluation(
    sourceEvaluationId: string,
    questionId: string
  ): Promise<EvaluationQuestionRecord | null> {
    const row = await this.prisma.question.findFirst({
      where: { id: questionId, sourceEvaluationId },
      include: { options: true }
    });
    return row ? toQuestionRecord(row) : null;
  }

  async update(
    sourceEvaluationId: string,
    questionId: string,
    input: UpdateEvaluationQuestionInput
  ): Promise<EvaluationQuestionRecord | null> {
    const existing = await this.prisma.question.findFirst({
      where: { id: questionId, sourceEvaluationId },
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
          ...(input.topicId ? { topicId: input.topicId } : {}),
          ...(input.type ? { type: input.type as QuestionType } : {}),
          statement: input.statement,
          explanation: input.explanation,
          difficulty: input.difficulty,
          evaluationImageId: input.evaluationImageId,
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

  async delete(sourceEvaluationId: string, questionId: string): Promise<boolean> {
    const result = await this.prisma.question.deleteMany({
      where: { id: questionId, sourceEvaluationId }
    });
    return result.count > 0;
  }
}

function toQuestionRecord(row: {
  id: string;
  topicId: string;
  sourceEvaluationId: string | null;
  type: QuestionType;
  statement: string;
  explanation: string | null;
  difficulty: string;
  evaluationImageId: string | null;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
}): EvaluationQuestionRecord {
  return {
    id: row.id,
    topicId: row.topicId,
    sourceEvaluationId: row.sourceEvaluationId,
    type: row.type as EvaluationQuestionType,
    statement: row.statement,
    explanation: row.explanation,
    difficulty: row.difficulty,
    evaluationImageId: row.evaluationImageId,
    options: row.options.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect
    }))
  };
}
