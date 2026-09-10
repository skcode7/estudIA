import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  CreateSubjectInput,
  SubjectRecord,
  SubjectRepository,
  UpdateSubjectInput
} from "../application/ports/subject.repository";

@Injectable()
export class PrismaSubjectRepository implements SubjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateSubjectInput): Promise<SubjectRecord> {
    return this.prisma.subject.create({
      data: {
        name: input.name,
        description: input.description ?? null
      }
    });
  }

  findAll(): Promise<SubjectRecord[]> {
    return this.prisma.subject.findMany({
      orderBy: { name: "asc" }
    });
  }

  findById(id: string): Promise<SubjectRecord | null> {
    return this.prisma.subject.findUnique({ where: { id } });
  }

  update(id: string, input: UpdateSubjectInput): Promise<SubjectRecord> {
    return this.prisma.subject.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description ?? null })
      }
    });
  }

  delete(id: string): Promise<void> {
    return this.prisma.subject.delete({ where: { id } }).then(() => undefined);
  }
}