import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OpenRouterClient } from "./openrouter.client";

describe("OpenRouterClient", () => {
  const originalEnv = {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL,
    appUrl: process.env.OPENROUTER_APP_URL,
    appTitle: process.env.OPENROUTER_APP_TITLE,
    appCategories: process.env.OPENROUTER_APP_CATEGORIES
  };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-api-key";
    delete process.env.OPENROUTER_MODEL;
    delete process.env.OPENROUTER_APP_URL;
    delete process.env.OPENROUTER_APP_TITLE;
    delete process.env.OPENROUTER_APP_CATEGORIES;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    if (originalEnv.apiKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalEnv.apiKey;
    }
    if (originalEnv.model === undefined) {
      delete process.env.OPENROUTER_MODEL;
    } else {
      process.env.OPENROUTER_MODEL = originalEnv.model;
    }
    if (originalEnv.appUrl === undefined) {
      delete process.env.OPENROUTER_APP_URL;
    } else {
      process.env.OPENROUTER_APP_URL = originalEnv.appUrl;
    }
    if (originalEnv.appTitle === undefined) {
      delete process.env.OPENROUTER_APP_TITLE;
    } else {
      process.env.OPENROUTER_APP_TITLE = originalEnv.appTitle;
    }
    if (originalEnv.appCategories === undefined) {
      delete process.env.OPENROUTER_APP_CATEGORIES;
    } else {
      process.env.OPENROUTER_APP_CATEGORIES = originalEnv.appCategories;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses OPENROUTER_MODEL by default and requests json_object", async () => {
    process.env.OPENROUTER_MODEL = "openrouter/auto";
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    await new OpenRouterClient().chat([{ role: "user", content: "hola" }]);

    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(request.body as string);
    expect(body.model).toBe("openrouter/auto");
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("allows overriding the model per call", async () => {
    process.env.OPENROUTER_MODEL = "openrouter/auto";
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
        status: 200
      })
    );

    await new OpenRouterClient().chat([{ role: "user", content: "hola" }], {
      model: "qwen/qwen3-vl-30b-a3b-instruct"
    });

    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(request.body as string);
    expect(body.model).toBe("qwen/qwen3-vl-30b-a3b-instruct");
  });

  it("skips json_object when json is false", async () => {
    process.env.OPENROUTER_MODEL = "openrouter/auto";
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "texto libre" } }] }), {
        status: 200
      })
    );

    await new OpenRouterClient().chat([{ role: "user", content: "hola" }], { json: false });

    const request = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(request.body as string);
    expect(body.response_format).toBeUndefined();
  });

  it("sends attribution headers when OPENROUTER_APP_URL is set", async () => {
    process.env.OPENROUTER_APP_URL = "https://estudia.kids/";
    process.env.OPENROUTER_APP_TITLE = "estudIA";
    process.env.OPENROUTER_APP_CATEGORIES = "game";
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
        status: 200
      })
    );

    await new OpenRouterClient().chat([{ role: "user", content: "hola" }]);

    const request = fetchMock.mock.calls[0]?.[1];
    expect(request.headers["HTTP-Referer"]).toBe("https://estudia.kids/");
    expect(request.headers["X-OpenRouter-Title"]).toBe("estudIA");
    expect(request.headers["X-OpenRouter-Categories"]).toBe("game");
  });

  it("does not send attribution headers when OPENROUTER_APP_URL is empty", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
        status: 200
      })
    );

    await new OpenRouterClient().chat([{ role: "user", content: "hola" }]);

    const request = fetchMock.mock.calls[0]?.[1];
    expect(request.headers["HTTP-Referer"]).toBeUndefined();
    expect(request.headers["X-OpenRouter-Title"]).toBeUndefined();
    expect(request.headers["X-OpenRouter-Categories"]).toBeUndefined();
  });

  it("extracts the provider message from a JSON error response", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "invalid api key" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(new OpenRouterClient().chat([])).rejects.toMatchObject({
      status: 401,
      message: "OpenRouter respondió con error 401: invalid api key"
    });
  });
});
