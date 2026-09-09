import { Module } from "@nestjs/common";

import { PrismaModule } from "./infrastructure/database/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { SubjectsModule } from "./modules/subjects/subjects.module";

@Module({
  imports: [PrismaModule, HealthModule, SubjectsModule]
})
export class AppModule {}
