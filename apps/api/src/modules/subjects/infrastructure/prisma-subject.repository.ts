import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  CreateSubjectInput,
  SubjectColor,
  SubjectIcon,
  SubjectRecord,
  SubjectRepository,
  UpdateSubjectInput
} from "../application/ports/subject.repository";

const DEFAULT_COLOR: SubjectColor = "violet";
const DEFAULT_ICON: SubjectIcon = "subjects";

type SubjectRow = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaSubjectRepository implements SubjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateSubjectInput): Promise<SubjectRecord> {
    return this.prisma.subject
      .create({
        data: {
          name: input.name,
          description: input.description ?? null,
          color: (input.color as SubjectColor) ?? DEFAULT_COLOR,
          icon: (input.icon as SubjectIcon) ?? DEFAULT_ICON
        }
      })
      .then((row) => this.toRecord(row));
  }

  async findAll(): Promise<SubjectRecord[]> {
    const subjects = await this.prisma.subject.findMany({ orderBy: { name: "asc" } });
    return this.enrich(subjects);
  }

  async findById(id: string): Promise<SubjectRecord | null> {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) return null;
    const records = await this.enrich([subject]);
    return records[0] ?? null;
  }

  update(id: string, input: UpdateSubjectInput): Promise<SubjectRecord> {
    return this.prisma.subject
      .update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description ?? null }),
          ...(input.color !== undefined && { color: input.color as SubjectColor }),
          ...(input.icon !== undefined && { icon: input.icon as SubjectIcon })
        }
      })
      .then((row) => this.toRecord(row));
  }

  delete(id: string): Promise<void> {
    return this.prisma.subject.delete({ where: { id } }).then(() => undefined);
  }

  private toRecord(row: SubjectRow): SubjectRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      materialsCount: 0,
      progress: null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Completa `materialsCount` y `progress` para cada materia en una sola pasada.
   * `materialsCount` suma los materiales de todos sus temas; `progress` es el
   * promedio simple de los `score` de los intentos completados de sus quizzes
   * (materia sin intentos => `null`, no 0%).
   */
  private async enrich(subjects: SubjectRow[]): Promise<SubjectRecord[]> {
    if (subjects.length === 0) return [];
    const ids = subjects.map((s) => s.id);

    const materialsCountBySubject = await this.materialsCountBySubject(ids);
    const progressBySubject = await this.progressBySubject(ids);

    return subjects.map((subject) => ({
      ...this.toRecord(subject),
      materialsCount: materialsCountBySubject.get(subject.id) ?? 0,
      progress: progressBySubject.get(subject.id) ?? null
    }));
  }

  private async materialsCountBySubject(subjectIds: string[]): Promise<Map<string, number>> {
    const topics = await this.prisma.topic.findMany({
      where: { subjectId: { in: subjectIds } },
      select: { subjectId: true, _count: { select: { materials: true } } }
    });

    const counts = new Map<string, number>();
    for (const topic of topics) {
      counts.set(topic.subjectId, (counts.get(topic.subjectId) ?? 0) + topic._count.materials);
    }
    return counts;
  }

  private async progressBySubject(subjectIds: string[]): Promise<Map<string, number>> {
    const attempts = await this.prisma.quizAttempt.findMany({
      where: {
        quiz: { subjectId: { in: subjectIds } },
        completedAt: { not: null },
        score: { not: null }
      },
      select: { quizId: true, score: true }
    });

    if (attempts.length === 0) return new Map();

    const quizIds = [...new Set(attempts.map((attempt) => attempt.quizId))];
    const quizzes = await this.prisma.quiz.findMany({
      where: { id: { in: quizIds } },
      select: { id: true, subjectId: true }
    });
    const subjectByQuiz = new Map(quizzes.map((quiz) => [quiz.id, quiz.subjectId] as const));

    const sums = new Map<string, { total: number; count: number }>();
    for (const attempt of attempts) {
      const subjectId = subjectByQuiz.get(attempt.quizId);
      if (!subjectId) continue;
      const current = sums.get(subjectId) ?? { total: 0, count: 0 };
      current.total += attempt.score ?? 0;
      current.count += 1;
      sums.set(subjectId, current);
    }

    const progress = new Map<string, number>();
    for (const [subjectId, { total, count }] of sums) {
      if (count > 0) progress.set(subjectId, Math.round((total / count) * 100) / 100);
    }
    return progress;
  }
}
