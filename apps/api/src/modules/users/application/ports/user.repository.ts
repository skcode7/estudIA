export interface UserRecord {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
}

export abstract class UserRepository {
  abstract findAll(): Promise<UserRecord[]>;
  abstract create(input: CreateUserInput): Promise<UserRecord>;
}
