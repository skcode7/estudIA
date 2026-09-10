import { Injectable } from "@nestjs/common";

import { UserRecord, UserRepository } from "../ports/user.repository";

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly repository: UserRepository) {}

  execute(): Promise<UserRecord[]> {
    return this.repository.findAll();
  }
}
