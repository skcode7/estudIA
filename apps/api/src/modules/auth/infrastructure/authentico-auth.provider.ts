import {
  AuthenticoClient,
  BusinessRejectionError,
  ConfigurationError,
  TransportError
} from "@ed_open/authentico-sdk";

import { AuthProvider, AuthSession, SignInInput } from "../application/ports/auth-provider";
import { AuthRejectedError, AuthUnavailableError, AuthConfigError } from "../auth.errors";

export interface AuthenticoConfig {
  baseUrl: string;
  application: string;
  account: string;
  timeoutMs?: number;
}

export class AuthenticoAuthProvider implements AuthProvider {
  private readonly client: { login: (c: { login: string; password: string }) => Promise<{ sessionId: string; message?: string }> };

  constructor(config: AuthenticoConfig, client?: AuthenticoClient) {
    if (client) {
      this.client = client;
      return;
    }
    try {
      this.client = new AuthenticoClient({
        baseUrl: config.baseUrl,
        application: config.application,
        account: config.account,
        timeoutMs: config.timeoutMs
      });
    } catch (error) {
      throw new AuthConfigError(
        error instanceof Error ? error.message : "Configuración de Authentico inválida"
      );
    }
  }

  async signIn(input: SignInInput): Promise<AuthSession> {
    try {
      const { sessionId, message } = await this.client.login({
        login: input.login,
        password: input.password
      });
      return message ? { sessionId, message } : { sessionId };
    } catch (error) {
      if (error instanceof BusinessRejectionError) {
        throw new AuthRejectedError(error.message ?? "Credenciales inválidas");
      }
      if (error instanceof TransportError) {
        throw new AuthUnavailableError(error.message ?? "Authentico no disponible");
      }
      if (error instanceof ConfigurationError) {
        throw new AuthConfigError(error.message ?? "Configuración de Authentico inválida");
      }
      throw new AuthUnavailableError(error instanceof Error ? error.message : "Error inesperado");
    }
  }
}