import { Module } from "@nestjs/common";

import { CreateSubjectUseCase } from "./application/use-cases/create-subject.use-case";
import { ListSubjectsUseCase } from "./application/use-cases/list-subjects.use-case";
import { SubjectRepository } from "./application/ports/subject.repository";
import { PrismaSubjectRepository } from "./infrastructure/prisma-subject.repository";
import { SubjectsController } from "./presentation/controllers/subjects.controller";

@Module({
  controllers: [SubjectsController],
  providers: [
    CreateSubjectUseCase,
    ListSubjectsUseCase,
    { provide: SubjectRepository, useClass: PrismaSubjectRepository }
  ]
})
export class SubjectsModule {}