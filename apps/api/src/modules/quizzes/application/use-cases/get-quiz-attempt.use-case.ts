import { Injectable, NotFoundException } from "@nestjs/common";

import { QuizAttemptDetailRecord, QuizRepository } from "../ports/quiz.repository";

@Injectable()
export class GetQuizAttemptUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  async execute(quizId: string, attemptId: string): Promise<QuizAttemptDetailRecord> {
    const attempt = await this.quizRepository.findAttemptDetail(quizId, attemptId);
    if (!attempt) {
      throw new NotFoundException(
        `Intento con id "${attemptId}" no encontrado para el quiz "${quizId}".`
      );
    }
    return attempt;
  }
}
