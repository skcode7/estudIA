import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { CreateUserInput, UserRecord, UserRepository } from "../application/ports/user.repository";

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<UserRecord[]> {
    return this.prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  }

  create(input: CreateUserInput): Promise<UserRecord> {
    return this.prisma.user.create({ data: { name: input.name } });
  }
}
