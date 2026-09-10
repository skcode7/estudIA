import { Module } from "@nestjs/common";

import { UserRepository } from "./application/ports/user.repository";
import { CreateUserUseCase } from "./application/use-cases/create-user.use-case";
import { ListUsersUseCase } from "./application/use-cases/list-users.use-case";
import { PrismaUserRepository } from "./infrastructure/prisma-user.repository";
import { UsersController } from "./presentation/controllers/users.controller";

@Module({
  controllers: [UsersController],
  providers: [
    ListUsersUseCase,
    CreateUserUseCase,
    { provide: UserRepository, useClass: PrismaUserRepository }
  ]
})
export class UsersModule {}
