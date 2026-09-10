import { Module } from "@nestjs/common";

import { PrismaModule } from "./infrastructure/database/prisma.module";
import { ObjectStorageModule } from "./infrastructure/object-storage/object-storage.module";
import { HealthModule } from "./modules/health/health.module";
import { MaterialsModule } from "./modules/materials/materials.module";
import { SubjectsModule } from "./modules/subjects/subjects.module";
import { TopicsModule } from "./modules/topics/topics.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    PrismaModule,
    ObjectStorageModule,
    HealthModule,
    SubjectsModule,
    TopicsModule,
    MaterialsModule,
    UsersModule
  ]
})
export class AppModule {}
