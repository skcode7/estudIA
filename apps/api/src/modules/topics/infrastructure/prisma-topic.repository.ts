import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  CreateTopicInput,
  ListTopicsOptions,
  TopicRecord,
  TopicRepository,
  UpdateTopicInput
} from "../application/ports/topic.repository";

@Injectable()
export class PrismaTopicRepository implements TopicRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateTopicInput): Promise<TopicRecord> {
    return this.prisma.topic.create({
      data: {
        subjectId: input.subjectId,
        name: input.name,
        description: input.description ?? null
      }
    });
  }

  findAll(options?: ListTopicsOptions): Promise<TopicRecord[]> {
    return this.prisma.topic.findMany({
      where: options?.subjectId ? { subjectId: options.subjectId } : undefined,
      orderBy: { name: "asc" }
    });
  }

  findById(id: string): Promise<TopicRecord | null> {
    return this.prisma.topic.findUnique({ where: { id } });
  }

  update(id: string, input: UpdateTopicInput): Promise<TopicRecord> {
    return this.prisma.topic.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description ?? null })
      }
    });
  }

  delete(id: string): Promise<void> {
    return this.prisma.topic.delete({ where: { id } }).then(() => undefined);
  }
}