import { Module } from "@nestjs/common";

import { SubjectRepository } from "../subjects/application/ports/subject.repository";
import { PrismaSubjectRepository } from "../subjects/infrastructure/prisma-subject.repository";
import { TopicRepository } from "../topics/application/ports/topic.repository";
import { PrismaTopicRepository } from "../topics/infrastructure/prisma-topic.repository";
import { QuizRepository } from "./application/ports/quiz.repository";
import { GenerateQuizUseCase } from "./application/use-cases/generate-quiz.use-case";
import { SubmitQuizAttemptUseCase } from "./application/use-cases/submit-quiz-attempt.use-case";
import { PrismaQuizRepository } from "./infrastructure/prisma-quiz.repository";
import { QuizzesController } from "./presentation/controllers/quizzes.controller";

@Module({
  controllers: [QuizzesController],
  providers: [
    GenerateQuizUseCase,
    SubmitQuizAttemptUseCase,
    { provide: SubjectRepository, useClass: PrismaSubjectRepository },
    { provide: TopicRepository, useClass: PrismaTopicRepository },
    { provide: QuizRepository, useClass: PrismaQuizRepository }
  ]
})
export class QuizzesModule {}