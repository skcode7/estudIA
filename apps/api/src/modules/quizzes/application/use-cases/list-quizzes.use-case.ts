import { Injectable, NotFoundException } from "@nestjs/common";

import { SubjectRepository } from "../../../subjects/application/ports/subject.repository";
import { QuizListItemRecord, QuizRepository } from "../ports/quiz.repository";

@Injectable()
export class ListQuizzesUseCase {
  constructor(
    private readonly subjectRepository: SubjectRepository,
    private readonly quizRepository: QuizRepository
  ) {}

  async execute(subjectId: string): Promise<QuizListItemRecord[]> {
    const subject = await this.subjectRepository.findById(subjectId);
    if (!subject) {
      throw new NotFoundException(`Materia con id "${subjectId}" no encontrada.`);
    }
    return this.quizRepository.listBySubject(subjectId);
  }
}
