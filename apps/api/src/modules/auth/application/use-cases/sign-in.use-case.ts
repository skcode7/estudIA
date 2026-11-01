import { Inject } from "@nestjs/common";

import { AuthProvider } from "../ports/auth-provider";
import { AuthRejectedError, AuthUnavailableError } from "../../auth.errors";

export interface SignInCommand {
  login: string;
  password: string;
}

export class SignInUseCase {
  constructor(@Inject(AuthProvider) private readonly authProvider: AuthProvider) {}

  async execute(command: SignInCommand): Promise<{ sessionId: string; message?: string }> {
    const login = command.login?.trim() ?? "";
    const password = command.password ?? "";

    if (!login) {
      throw new AuthRejectedError("El usuario es obligatorio");
    }
    if (!password) {
      throw new AuthRejectedError("La contraseña es obligatoria");
    }

    return this.authProvider.signIn({ login, password });
  }
}