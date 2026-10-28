import { Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeepSeekClient } from "./deepseek.client";

describe("DeepSeekClient", () => {
  const originalApiKey = process.env.DEEPSEEK_API_KEY;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = "test-api-key";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = originalApiKey;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("logs the status and plaintext HTTP error body without changing the public error", async () => {
    const loggerError = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    fetchMock.mockResolvedValue(
      new Response("upstream maintenance", {
        status: 502,
        headers: { "Content-Type": "text/plain" }
      })
    );

    await expect(new DeepSeekClient().chat([])).rejects.toMatchObject({
      name: "DeepSeekClientError",
      status: 502,
      message: "DeepSeek respondió con error 502: no se pudo leer el cuerpo del error"
    });

    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining("status=502")
    );
    expect(loggerError.mock.calls[0]?.[0]).toContain("upstream maintenance");
  });

  it("keeps extracting the provider message from a JSON error response", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "invalid api key" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(new DeepSeekClient().chat([])).rejects.toMatchObject({
      status: 401,
      message: "DeepSeek respondió con error 401: invalid api key"
    });
  });
});
