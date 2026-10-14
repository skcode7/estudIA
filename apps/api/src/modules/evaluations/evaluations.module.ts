import { Module } from "@nestjs/common";

import { SubjectRepository } from "../subjects/application/ports/subject.repository";
import { PrismaSubjectRepository } from "../subjects/infrastructure/prisma-subject.repository";
import { TopicRepository } from "../topics/application/ports/topic.repository";
import { PrismaTopicRepository } from "../topics/infrastructure/prisma-topic.repository";
import { EvaluationImageRepository } from "./application/ports/evaluation-image.repository";
import { EvaluationQuestionRepository } from "./application/ports/evaluation-question.repository";
import { EvaluationRepository } from "./application/ports/evaluation.repository";
import { CreateEvaluationUseCase } from "./application/use-cases/create-evaluation.use-case";
import { AnalyzeEvaluationDraftUseCase } from "./application/use-cases/analyze-evaluation-draft.use-case";
import { DeleteEvaluationQuestionUseCase } from "./application/use-cases/delete-evaluation-question.use-case";
import { DeleteEvaluationUseCase } from "./application/use-cases/delete-evaluation.use-case";
import { GetEvaluationImageUseCase } from "./application/use-cases/get-evaluation-image.use-case";
import { ListEvaluationQuestionsUseCase } from "./application/use-cases/list-evaluation-questions.use-case";
import { ListEvaluationsUseCase } from "./application/use-cases/list-evaluations.use-case";
import { ProcessEvaluationUseCase } from "./application/use-cases/process-evaluation.use-case";
import { UpdateEvaluationQuestionUseCase } from "./application/use-cases/update-evaluation-question.use-case";
import { PrismaEvaluationImageRepository } from "./infrastructure/prisma-evaluation-image.repository";
import { PrismaEvaluationQuestionRepository } from "./infrastructure/prisma-evaluation-question.repository";
import { PrismaEvaluationRepository } from "./infrastructure/prisma-evaluation.repository";
import { EvaluationsController } from "./presentation/controllers/evaluations.controller";

@Module({
  controllers: [EvaluationsController],
  providers: [
    AnalyzeEvaluationDraftUseCase,
    CreateEvaluationUseCase,
    ListEvaluationsUseCase,
    ProcessEvaluationUseCase,
    ListEvaluationQuestionsUseCase,
    UpdateEvaluationQuestionUseCase,
    DeleteEvaluationQuestionUseCase,
    GetEvaluationImageUseCase,
    DeleteEvaluationUseCase,
    { provide: EvaluationRepository, useClass: PrismaEvaluationRepository },
    { provide: EvaluationImageRepository, useClass: PrismaEvaluationImageRepository },
    { provide: EvaluationQuestionRepository, useClass: PrismaEvaluationQuestionRepository },
    { provide: SubjectRepository, useClass: PrismaSubjectRepository },
    { provide: TopicRepository, useClass: PrismaTopicRepository }
  ]
})
export class EvaluationsModule {}
