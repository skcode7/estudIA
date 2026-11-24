import { Injectable } from "@nestjs/common";

import { ChatMessage } from "../chat.types";

export class OpenRouterClientError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "OpenRouterClientError";
    this.status = status;
  }
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

@Injectable()
export class OpenRouterClient {
  private readonly baseUrl = "https://openrouter.ai/api/v1";

  async chat(
    messages: ChatMessage[],
    options: { model?: string; json?: boolean } = {}
  ): Promise<string> {
    const { apiKey, model } = this.readConfig(options.model);
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: 0.1,
      stream: false
    };
    if (options.json !== false) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.buildHeaders(apiKey),
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const detail = await this.readErrorDetail(response);
      throw new OpenRouterClientError(
        response.status,
        `OpenRouter respondió con error ${response.status}: ${detail}`
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new OpenRouterClientError(200, "OpenRouter no devolvió contenido en la respuesta.");
    }
    return content;
  }

  private readConfig(requestedModel?: string): { apiKey: string; model: string } {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Falta la variable de entorno OPENROUTER_API_KEY. Configúrala antes de usar OpenRouter."
      );
    }
    return {
      apiKey,
      model: requestedModel ?? process.env.OPENROUTER_MODEL ?? "openrouter/auto"
    };
  }

  private buildHeaders(apiKey: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    };
    const appUrl = process.env.OPENROUTER_APP_URL?.trim();
    if (appUrl) {
      headers["HTTP-Referer"] = appUrl;
      const title = process.env.OPENROUTER_APP_TITLE?.trim();
      if (title) {
        headers["X-OpenRouter-Title"] = title;
      }
      const categories = process.env.OPENROUTER_APP_CATEGORIES?.trim();
      if (categories) {
        headers["X-OpenRouter-Categories"] = categories;
      }
    }
    return headers;
  }

  private async readErrorDetail(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      return body.error?.message ?? "respuesta vacía";
    } catch {
      return "no se pudo leer el cuerpo del error";
    }
  }
}
