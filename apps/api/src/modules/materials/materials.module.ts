import { Module } from "@nestjs/common";

import { TopicRepository } from "../topics/application/ports/topic.repository";
import { PrismaTopicRepository } from "../topics/infrastructure/prisma-topic.repository";
import { CreateFileMaterialUseCase } from "./application/use-cases/create-file-material.use-case";
import { CreateTextMaterialUseCase } from "./application/use-cases/create-text-material.use-case";
import { DeleteMaterialUseCase } from "./application/use-cases/delete-material.use-case";
import { GetMaterialUseCase } from "./application/use-cases/get-material.use-case";
import { ListMaterialsUseCase } from "./application/use-cases/list-materials.use-case";
import { MaterialRepository } from "./application/ports/material.repository";
import { PrismaMaterialRepository } from "./infrastructure/prisma-material.repository";
import { MaterialsController } from "./presentation/controllers/materials.controller";

@Module({
  controllers: [MaterialsController],
  providers: [
    CreateTextMaterialUseCase,
    CreateFileMaterialUseCase,
    ListMaterialsUseCase,
    GetMaterialUseCase,
    DeleteMaterialUseCase,
    { provide: MaterialRepository, useClass: PrismaMaterialRepository },
    { provide: TopicRepository, useClass: PrismaTopicRepository }
  ]
})
export class MaterialsModule {}