import { Module } from "@nestjs/common";

import { SubjectRepository } from "../subjects/application/ports/subject.repository";
import { PrismaSubjectRepository } from "../subjects/infrastructure/prisma-subject.repository";
import { TopicRepository } from "../topics/application/ports/topic.repository";
import { PrismaTopicRepository } from "../topics/infrastructure/prisma-topic.repository";
import { MaterialQuestionRepository } from "./application/ports/material-question.repository";
import { MaterialRepository } from "./application/ports/material.repository";
import { AnalyzeMaterialDraftUseCase } from "./application/use-cases/analyze-material-draft.use-case";
import { CreateFileMaterialUseCase } from "./application/use-cases/create-file-material.use-case";
import { CreateTextMaterialUseCase } from "./application/use-cases/create-text-material.use-case";
import { DeleteMaterialUseCase } from "./application/use-cases/delete-material.use-case";
import { GetMaterialUseCase } from "./application/use-cases/get-material.use-case";
import { ListMaterialsUseCase } from "./application/use-cases/list-materials.use-case";
import { ProcessMaterialUseCase, PROCESS_MATERIAL_CONFIG } from "./application/use-cases/process-material.use-case";
import { UpdateMaterialUseCase } from "./application/use-cases/update-material.use-case";
import { PrismaMaterialQuestionRepository } from "./infrastructure/prisma-material-question.repository";
import { PrismaMaterialRepository } from "./infrastructure/prisma-material.repository";
import { MaterialsController } from "./presentation/controllers/materials.controller";
import { parsePositiveInt } from "../../shared/env.utils";

@Module({
  controllers: [MaterialsController],
  providers: [
    CreateTextMaterialUseCase,
    CreateFileMaterialUseCase,
    ListMaterialsUseCase,
    GetMaterialUseCase,
    DeleteMaterialUseCase,
    ProcessMaterialUseCase,
    UpdateMaterialUseCase,
    AnalyzeMaterialDraftUseCase,
    { provide: MaterialRepository, useClass: PrismaMaterialRepository },
    { provide: MaterialQuestionRepository, useClass: PrismaMaterialQuestionRepository },
    { provide: TopicRepository, useClass: PrismaTopicRepository },
    { provide: SubjectRepository, useClass: PrismaSubjectRepository },
    {
      provide: PROCESS_MATERIAL_CONFIG,
      useFactory: () => ({
        questionsCount: parsePositiveInt(process.env.AI_QUESTIONS_PER_MATERIAL, 3)
      })
    }
  ]
})
export class MaterialsModule {}