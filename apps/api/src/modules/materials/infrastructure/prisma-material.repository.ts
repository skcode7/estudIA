import { Injectable } from "@nestjs/common";
import { MaterialProcessingStatus, MaterialType } from "@prisma/client";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  CreateMaterialInput,
  MaterialRecord,
  MaterialRepository,
  UpdateMaterialFieldsInput
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
        hasEmbeddedFigures: input.hasEmbeddedFigures ?? false,
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

  updateProcessingStatus(
    id: string,
    status: MaterialProcessingStatus,
    processingError: string | null = null
  ): Promise<MaterialRecord> {
    return this.prisma.material.update({
      where: { id },
      data: { processingStatus: status, processingError }
    });
  }

  updateFields(id: string, fields: UpdateMaterialFieldsInput): Promise<MaterialRecord> {
    return this.prisma.material.update({
      where: { id },
      data: {
        ...(fields.title !== undefined ? { title: fields.title } : {}),
        ...(fields.content !== undefined ? { content: fields.content } : {}),
        ...(fields.hasEmbeddedFigures !== undefined
          ? { hasEmbeddedFigures: fields.hasEmbeddedFigures }
          : {})
      }
    });
  }

  delete(id: string): Promise<void> {
    return this.prisma.material.delete({ where: { id } }).then(() => undefined);
  }
}