import { Module } from "@nestjs/common";

import { SubjectRepository } from "../subjects/application/ports/subject.repository";
import { PrismaSubjectRepository } from "../subjects/infrastructure/prisma-subject.repository";
import { CreateTopicUseCase } from "./application/use-cases/create-topic.use-case";
import { ListTopicsUseCase } from "./application/use-cases/list-topics.use-case";
import { GetTopicUseCase } from "./application/use-cases/get-topic.use-case";
import { UpdateTopicUseCase } from "./application/use-cases/update-topic.use-case";
import { DeleteTopicUseCase } from "./application/use-cases/delete-topic.use-case";
import { TopicRepository } from "./application/ports/topic.repository";
import { PrismaTopicRepository } from "./infrastructure/prisma-topic.repository";
import { TopicsController } from "./presentation/controllers/topics.controller";

@Module({
  controllers: [TopicsController],
  providers: [
    CreateTopicUseCase,
    ListTopicsUseCase,
    GetTopicUseCase,
    UpdateTopicUseCase,
    DeleteTopicUseCase,
    { provide: TopicRepository, useClass: PrismaTopicRepository },
    { provide: SubjectRepository, useClass: PrismaSubjectRepository }
  ]
})
export class TopicsModule {}