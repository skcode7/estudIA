import { Injectable, NotFoundException } from "@nestjs/common";

import { QuizRecord, QuizRepository } from "../ports/quiz.repository";

@Injectable()
export class GetQuizUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  async execute(id: string): Promise<QuizRecord> {
    const quiz = await this.quizRepository.findQuizForPresentation(id);
    if (!quiz) {
      throw new NotFoundException(`Quiz con id "${id}" no encontrado.`);
    }
    return quiz;
  }
}
