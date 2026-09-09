import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  CreateSubjectInput,
  SubjectRecord,
  SubjectRepository
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
      orderBy: { createdAt: "asc" }
    });
  }
}