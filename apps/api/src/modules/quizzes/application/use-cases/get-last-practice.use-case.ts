import { Injectable } from "@nestjs/common";

import { QuizRepository } from "../ports/quiz.repository";

@Injectable()
export class GetLastPracticeUseCase {
  constructor(private readonly quizRepository: QuizRepository) {}

  execute(): Promise<Date | null> {
    return this.quizRepository.findLastCompletedAttemptAt();
  }
}
