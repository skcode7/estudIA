import { Prisma } from "@prisma/client";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import {
  CreateQuizInput,
  QuizAttemptRecord,
  QuizGradingRecord,
  QuizRecord,
  QuizRepository,
  SaveAttemptInput
} from "../application/ports/quiz.repository";

@Injectable()
export class PrismaQuizRepository implements QuizRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuestionIdsByTopics(topicIds: string[]): Promise<string[]> {
    if (topicIds.length === 0) {
      return [];
    }
    const questions = await this.prisma.question.findMany({
      where: { topicId: { in: topicIds } },
      select: { id: true }
    });
    return questions.map((question) => question.id);
  }

  async createQuiz(input: CreateQuizInput): Promise<QuizRecord> {
    return this.prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          title: input.title,
          subjectId: input.subjectId,
          topicId: input.topicId ?? null,
          questions: {
            create: input.questionIds.map((questionId, order) => ({ questionId, order }))
          }
        },
        include: {
          subject: { select: { name: true } },
          topic: { select: { name: true } },
          questions: {
            orderBy: { order: "asc" },
            include: {
              question: {
                select: {
                  id: true,
                  statement: true,
                  imageId: true,
                  sourceMaterialId: true,
                  options: { select: { id: true, text: true } }
                }
              }
            }
          }
        }
      });

      return {
        id: quiz.id,
        title: quiz.title,
        subjectId: quiz.subjectId,
        subjectName: quiz.subject.name,
        topicId: quiz.topicId,
        topicName: quiz.topic?.name ?? null,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt,
        questions: quiz.questions.map((quizQuestion) => ({
          id: quizQuestion.question.id,
          statement: quizQuestion.question.statement,
          imageId: quizQuestion.question.imageId,
          sourceMaterialId: quizQuestion.question.sourceMaterialId,
          options: quizQuestion.question.options.map((option) => ({
            id: option.id,
            text: option.text
          }))
        }))
      };
    });
  }

  async findQuizForGrading(id: string): Promise<QuizGradingRecord | null> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          include: {
            question: {
              select: {
                id: true,
                topicId: true,
                statement: true,
                explanation: true,
                options: { select: { id: true, text: true, isCorrect: true } }
              }
            }
          }
        }
      }
    });
    if (!quiz) {
      return null;
    }
    return {
      id: quiz.id,
      subjectId: quiz.subjectId,
      topicId: quiz.topicId,
      questions: quiz.questions.map((quizQuestion) => ({
        id: quizQuestion.question.id,
        topicId: quizQuestion.question.topicId,
        statement: quizQuestion.question.statement,
        explanation: quizQuestion.question.explanation,
        options: quizQuestion.question.options.map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect
        }))
      }))
    };
  }

  async saveAttempt(input: SaveAttemptInput): Promise<QuizAttemptRecord> {
    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.quizAttempt.create({
        data: {
          quizId: input.quizId,
          startedAt: input.startedAt,
          completedAt: input.completedAt,
          score: input.score,
          answers: {
            create: input.answers.map((answer) => ({
              questionId: answer.questionId,
              selectedOptionId: answer.selectedOptionId,
              isCorrect: answer.isCorrect
            }))
          }
        }
      });

      await this.updateTopicProgress(tx, input);

      return {
        id: attempt.id,
        quizId: attempt.quizId,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt ?? input.completedAt,
        score: attempt.score ?? 0
      };
    });
  }

  private async updateTopicProgress(
    tx: Prisma.TransactionClient,
    input: SaveAttemptInput
  ): Promise<void> {
    const questionIds = input.answers.map((answer) => answer.questionId);
    const questions = await tx.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, topicId: true }
    });
    const statsByTopic = new Map<string, { correct: number; total: number }>();
    for (const question of questions) {
      const answer = input.answers.find((candidate) => candidate.questionId === question.id);
      const stats = statsByTopic.get(question.topicId) ?? { correct: 0, total: 0 };
      stats.total += 1;
      if (answer?.isCorrect) {
        stats.correct += 1;
      }
      statsByTopic.set(question.topicId, stats);
    }

    for (const [topicId, stats] of statsByTopic) {
      const existing = await tx.topicProgress.findUnique({ where: { topicId } });
      const totalAnswers = (existing?.totalAnswers ?? 0) + stats.total;
      const correctAnswers = (existing?.correctAnswers ?? 0) + stats.correct;
      if (existing) {
        await tx.topicProgress.update({
          where: { id: existing.id },
          data: {
            attempts: { increment: 1 },
            totalAnswers: { increment: stats.total },
            correctAnswers: { increment: stats.correct },
            masteryScore: totalAnswers > 0 ? correctAnswers / totalAnswers : 0
          }
        });
      } else {
        await tx.topicProgress.create({
          data: {
            topicId,
            attempts: 1,
            totalAnswers,
            correctAnswers,
            masteryScore: totalAnswers > 0 ? correctAnswers / totalAnswers : 0
          }
        });
      }
    }
  }
}