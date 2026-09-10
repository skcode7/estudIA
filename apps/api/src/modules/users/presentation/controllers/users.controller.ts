import { Body, Controller, Get, Post } from "@nestjs/common";

import { CreateUserUseCase } from "../../application/use-cases/create-user.use-case";
import { ListUsersUseCase } from "../../application/use-cases/list-users.use-case";
import { UserRecord } from "../../application/ports/user.repository";
import { CreateUserDto, UserDto } from "../dto/users.dto";

@Controller("users")
export class UsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly createUserUseCase: CreateUserUseCase
  ) {}

  @Get()
  findAll(): Promise<UserDto[]> {
    return this.listUsersUseCase.execute().then((users) => users.map(toUserDto));
  }

  @Post()
  create(@Body() dto: CreateUserDto): Promise<UserDto> {
    return this.createUserUseCase.execute({ name: dto.name }).then(toUserDto);
  }
}

function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}
