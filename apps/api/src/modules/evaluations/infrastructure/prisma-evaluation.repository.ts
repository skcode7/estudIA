import { Injectable } from "@nestjs/common";
import { EvaluationProcessingStatus } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  CreateEvaluationInput,
  EvaluationRecord,
  EvaluationRepository
} from "../application/ports/evaluation.repository";

@Injectable()
export class PrismaEvaluationRepository implements EvaluationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateEvaluationInput): Promise<EvaluationRecord> {
    return this.prisma.evaluation.create({
      data: {
        id: input.id,
        topicId: input.topicId,
        title: input.title,
        dateTaken: input.dateTaken ?? null,
        processingStatus: "PENDING" as EvaluationProcessingStatus
      }
    });
  }

  findByTopicIds(topicIds: string[]): Promise<EvaluationRecord[]> {
    if (topicIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.evaluation.findMany({
      where: { topicId: { in: topicIds } },
      orderBy: [{ dateTaken: "desc" }, { createdAt: "desc" }]
    });
  }

  findById(id: string): Promise<EvaluationRecord | null> {
    return this.prisma.evaluation.findUnique({ where: { id } });
  }

  updateProcessingStatus(
    id: string,
    status: EvaluationProcessingStatus,
    processingError: string | null = null
  ): Promise<EvaluationRecord> {
    return this.prisma.evaluation.update({
      where: { id },
      data: { processingStatus: status, processingError }
    });
  }

  delete(id: string): Promise<void> {
    return this.prisma.evaluation.delete({ where: { id } }).then(() => undefined);
  }
}
