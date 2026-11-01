import { Module } from "@nestjs/common";

import { AuthProvider } from "./application/ports/auth-provider";
import { AuthenticoAuthProvider, AuthenticoConfig } from "./infrastructure/authentico-auth.provider";
import { SignInUseCase } from "./application/use-cases/sign-in.use-case";
import { AuthController } from "./presentation/controllers/auth.controller";

function readConfig(): AuthenticoConfig {
  const baseUrl = process.env.AUTHENTICO_BASE_URL?.trim();
  const application = process.env.AUTHENTICO_APPLICATION?.trim();
  const account = process.env.AUTHENTICO_ACCOUNT?.trim();
  const timeoutMs = process.env.AUTHENTICO_TIMEOUT_MS
    ? Number(process.env.AUTHENTICO_TIMEOUT_MS)
    : undefined;

  if (!baseUrl) throw new Error("AUTHENTICO_BASE_URL es obligatoria");
  if (!application) throw new Error("AUTHENTICO_APPLICATION es obligatoria");
  if (!account) throw new Error("AUTHENTICO_ACCOUNT es obligatoria");

  return {
    baseUrl,
    application,
    account,
    timeoutMs: Number.isFinite(timeoutMs) && (timeoutMs ?? 0) > 0 ? timeoutMs : undefined
  };
}

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: AuthProvider,
      useFactory: () => new AuthenticoAuthProvider(readConfig())
    },
    SignInUseCase
  ],
  exports: [AuthProvider, SignInUseCase]
})
export class AuthModule {}