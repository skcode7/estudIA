import { Injectable } from "@nestjs/common";

import { CreateUserInput, UserRecord, UserRepository } from "../ports/user.repository";

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly repository: UserRepository) {}

  execute(input: CreateUserInput): Promise<UserRecord> {
    return this.repository.create(input);
  }
}
