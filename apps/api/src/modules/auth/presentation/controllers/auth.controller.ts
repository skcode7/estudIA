import { Body, Controller, HttpException, HttpStatus, Post } from "@nestjs/common";

import { SignInUseCase } from "../../application/use-cases/sign-in.use-case";
import { SignInDto, SignInResponse } from "../dto/auth.dto";
import { AuthConfigError, AuthRejectedError, AuthUnavailableError } from "../../auth.errors";

@Controller("auth")
export class AuthController {
  constructor(private readonly signInUseCase: SignInUseCase) {}

  @Post("login")
  async login(@Body() dto: SignInDto): Promise<SignInResponse> {
    try {
      const result = await this.signInUseCase.execute({ login: dto.login, password: dto.password });
      return result.message
        ? { sessionId: result.sessionId, message: result.message }
        : { sessionId: result.sessionId };
    } catch (error) {
      if (error instanceof AuthRejectedError) {
        throw new HttpException({ message: error.message }, HttpStatus.UNAUTHORIZED);
      }
      if (error instanceof AuthUnavailableError) {
        throw new HttpException({ message: error.message }, HttpStatus.BAD_GATEWAY);
      }
      if (error instanceof AuthConfigError) {
        throw new HttpException({ message: error.message }, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      throw new HttpException({ message: "Error inesperado" }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}