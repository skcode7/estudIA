import { describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../ports/auth-provider";
import { SignInUseCase } from "./sign-in.use-case";
import { AuthRejectedError } from "../../auth.errors";

function makeProvider(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    signIn: vi.fn().mockResolvedValue({ sessionId: "sess-1", message: "ok" }),
    ...overrides
  } as AuthProvider;
}

describe("SignInUseCase", () => {
  it("delega al provider con login/password recortado", async () => {
    const provider = makeProvider();
    const useCase = new SignInUseCase(provider);

    const result = await useCase.execute({ login: "  CHARLY  ", password: "secret" });

    expect(provider.signIn).toHaveBeenCalledWith({ login: "CHARLY", password: "secret" });
    expect(result).toEqual({ sessionId: "sess-1", message: "ok" });
  });

  it("rechaza login vacío", async () => {
    const provider = makeProvider();
    const useCase = new SignInUseCase(provider);

    await expect(useCase.execute({ login: "   ", password: "x" })).rejects.toBeInstanceOf(
      AuthRejectedError
    );
    expect(provider.signIn).not.toHaveBeenCalled();
  });

  it("rechaza password vacío", async () => {
    const provider = makeProvider();
    const useCase = new SignInUseCase(provider);

    await expect(useCase.execute({ login: "CHARLY", password: "" })).rejects.toBeInstanceOf(
      AuthRejectedError
    );
    expect(provider.signIn).not.toHaveBeenCalled();
  });

  it("propaga errores del provider sin modificarlos", async () => {
    const provider = makeProvider({
      signIn: vi.fn().mockRejectedValue(new AuthRejectedError("nope"))
    });
    const useCase = new SignInUseCase(provider);

    await expect(useCase.execute({ login: "CHARLY", password: "x" })).rejects.toBeInstanceOf(
      AuthRejectedError
    );
  });
});