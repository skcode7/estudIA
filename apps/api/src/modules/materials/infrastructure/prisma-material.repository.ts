import { Injectable } from "@nestjs/common";
import { MaterialProcessingStatus, MaterialType } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  CreateMaterialInput,
  MaterialRecord,
  MaterialRepository
} from "../application/ports/material.repository";

@Injectable()
export class PrismaMaterialRepository implements MaterialRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateMaterialInput): Promise<MaterialRecord> {
    return this.prisma.material.create({
      data: {
        topicId: input.topicId,
        type: input.type as MaterialType,
        title: input.title,
        content: input.content ?? null,
        storageKey: input.storageKey ?? null,
        processingStatus: "PENDING" as MaterialProcessingStatus
      }
    });
  }

  findByTopic(topicId: string): Promise<MaterialRecord[]> {
    return this.prisma.material.findMany({
      where: { topicId },
      orderBy: { createdAt: "desc" }
    });
  }

  findById(id: string): Promise<MaterialRecord | null> {
    return this.prisma.material.findUnique({ where: { id } });
  }

  delete(id: string): Promise<void> {
    return this.prisma.material.delete({ where: { id } }).then(() => undefined);
  }
}