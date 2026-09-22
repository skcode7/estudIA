import { Body, Controller, Param, Post } from "@nestjs/common";

import { GenerateQuizUseCase } from "../../application/use-cases/generate-quiz.use-case";
import { SubmitQuizAttemptUseCase } from "../../application/use-cases/submit-quiz-attempt.use-case";
import { QuizRecord } from "../../application/ports/quiz.repository";
import {
  GenerateQuizDto,
  QuizAnswerFeedbackDto,
  QuizAttemptResultDto,
  QuizDto,
  SubmitAttemptDto
} from "../dto/quizzes.dto";
import { shuffle } from "../../../../shared/random.utils";

@Controller("quizzes")
export class QuizzesController {
  constructor(
    private readonly generateQuizUseCase: GenerateQuizUseCase,
    private readonly submitQuizAttemptUseCase: SubmitQuizAttemptUseCase
  ) {}

  @Post("generate")
  generate(@Body() dto: GenerateQuizDto): Promise<QuizDto> {
    return this.generateQuizUseCase
      .execute({ subjectId: dto.subjectId, topicId: dto.topicId })
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
          selectedOptionId: answer.selectedOptionId
        }))
      })
      .then(toAttemptResultDto);
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
    questions: shuffle(quiz.questions).map((question) => ({
      id: question.id,
      statement: question.statement,
      options: shuffle(question.options)
    }))
  };
}

function toAttemptResultDto(result: {
  attempt: { id: string; quizId: string; startedAt: Date; completedAt: Date; score: number };
  answers: QuizAnswerFeedbackDto[];
}): QuizAttemptResultDto {
  return {
    attemptId: result.attempt.id,
    quizId: result.attempt.quizId,
    score: result.attempt.score,
    startedAt: result.attempt.startedAt.toISOString(),
    completedAt: result.attempt.completedAt.toISOString(),
    answers: result.answers
  };
}