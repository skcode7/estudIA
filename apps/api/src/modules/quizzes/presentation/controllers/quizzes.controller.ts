import { BadRequestException, Body, Controller, Get, Param, Post, Query } from "@nestjs/common";

import { GenerateQuizUseCase } from "../../application/use-cases/generate-quiz.use-case";
import { GetQuizUseCase } from "../../application/use-cases/get-quiz.use-case";
import { GetQuizAttemptUseCase } from "../../application/use-cases/get-quiz-attempt.use-case";
import { ListQuizzesUseCase } from "../../application/use-cases/list-quizzes.use-case";
import { SubmitQuizAttemptUseCase, QuizAnswerFeedback } from "../../application/use-cases/submit-quiz-attempt.use-case";
import {
  QuizAttemptDetailRecord,
  QuizListItemRecord,
  QuizRecord
} from "../../application/ports/quiz.repository";
import {
  GenerateQuizDto,
  QuizAttemptDetailDto,
  QuizAttemptResultDto,
  QuizDto,
  QuizListItemDto,
  QuizQuestionTypeDto,
  QuizSizeDto,
  SubmitAttemptDto
} from "../dto/quizzes.dto";

@Controller("quizzes")
export class QuizzesController {
  constructor(
    private readonly generateQuizUseCase: GenerateQuizUseCase,
    private readonly getQuizUseCase: GetQuizUseCase,
    private readonly submitQuizAttemptUseCase: SubmitQuizAttemptUseCase,
    private readonly listQuizzesUseCase: ListQuizzesUseCase,
    private readonly getQuizAttemptUseCase: GetQuizAttemptUseCase
  ) {}

  @Post("generate")
  generate(@Body() dto: GenerateQuizDto): Promise<QuizDto> {
    return this.generateQuizUseCase
      .execute({
        subjectId: dto.subjectId,
        topicId: dto.topicId,
        size: dto.size ?? QuizSizeDto.MEDIUM
      })
      .then(toQuizDto);
  }

  @Post(":id/attempts")
  submit(@Param("id") id: string, @Body() dto: SubmitAttemptDto): Promise<QuizAttemptResultDto> {
    return this.submitQuizAttemptUseCase
      .execute({
        quizId: id,
        startedAt: new Date(dto.startedAt),
        answers: dto.answers.map((answer) => ({
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId ?? null,
          answerText: answer.answerText ?? null
        }))
      })
      .then(toAttemptResultDto);
  }

  @Get()
  async findAll(@Query("subjectId") subjectId: string): Promise<QuizListItemDto[]> {
    if (!subjectId) {
      throw new BadRequestException('El parámetro "subjectId" es obligatorio.');
    }
    const quizzes = await this.listQuizzesUseCase.execute(subjectId);
    return quizzes.map(toQuizListItemDto);
  }

  @Get(":id")
  get(@Param("id") id: string): Promise<QuizDto> {
    return this.getQuizUseCase.execute(id).then(toQuizDto);
  }

  @Get(":id/attempts/:attemptId")
  findAttempt(
    @Param("id") id: string,
    @Param("attemptId") attemptId: string
  ): Promise<QuizAttemptDetailDto> {
    return this.getQuizAttemptUseCase.execute(id, attemptId).then(toQuizAttemptDetailDto);
  }
}

function toQuizDto(quiz: QuizRecord): QuizDto {
  return {
    id: quiz.id,
    title: quiz.title,
    subjectId: quiz.subjectId,
    subjectName: quiz.subjectName,
    topicId: quiz.topicId,
    topicName: quiz.topicName,
    createdAt: quiz.createdAt.toISOString(),
    updatedAt: quiz.updatedAt.toISOString(),
    questions: quiz.questions.map((question) => ({
      id: question.id,
      type: question.type as QuizQuestionTypeDto,
      statement: question.statement,
      imageUrl: toQuestionImageUrl(question),
      options: question.options
    }))
  };
}

function toQuestionImageUrl(question: {
  imageId: string | null;
  sourceMaterialId: string | null;
  evaluationImageId: string | null;
  sourceEvaluationId: string | null;
}): string | null {
  if (question.imageId && question.sourceMaterialId) {
    return `/materials/${question.sourceMaterialId}/images/${question.imageId}`;
  }
  if (question.evaluationImageId && question.sourceEvaluationId) {
    return `/evaluations/${question.sourceEvaluationId}/images/${question.evaluationImageId}`;
  }
  return null;
}

function toAttemptResultDto(result: {
  attempt: { id: string; quizId: string; startedAt: Date; completedAt: Date; score: number };
  answers: QuizAnswerFeedback[];
}): QuizAttemptResultDto {
  return {
    attemptId: result.attempt.id,
    quizId: result.attempt.quizId,
    score: result.attempt.score,
    startedAt: result.attempt.startedAt.toISOString(),
    completedAt: result.attempt.completedAt.toISOString(),
    answers: result.answers.map((answer) => ({
      questionId: answer.questionId,
      statement: answer.statement,
      selectedOptionId: answer.selectedOptionId ?? null,
      correctOptionId: answer.correctOptionId ?? null,
      isCorrect: answer.isCorrect,
      explanation: answer.explanation
    }))
  };
}

function toQuizListItemDto(item: QuizListItemRecord): QuizListItemDto {
  return {
    id: item.id,
    title: item.title,
    topicId: item.topicId,
    topicName: item.topicName,
    questionCount: item.questionCount,
    attemptId: item.lastAttempt?.id ?? null,
    score: item.lastAttempt?.score ?? null,
    completedAt: item.lastAttempt?.completedAt.toISOString() ?? null,
    createdAt: item.createdAt.toISOString()
  };
}

function toQuizAttemptDetailDto(detail: QuizAttemptDetailRecord): QuizAttemptDetailDto {
  return {
    attemptId: detail.attemptId,
    quizId: detail.quizId,
    quizTitle: detail.quizTitle,
    score: detail.score,
    completedAt: detail.completedAt.toISOString(),
    answers: detail.answers.map((answer) => ({
      questionId: answer.questionId,
      statement: answer.statement,
      imageUrl: toQuestionImageUrl(answer),
      options: answer.options.map((option) => ({
        id: option.id,
        text: option.text,
        isCorrect: option.isCorrect
      })),
      selectedOptionId: answer.selectedOptionId,
      isCorrect: answer.isCorrect,
      explanation: answer.explanation
    }))
  };
}