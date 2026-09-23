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

  async chat(messages: ChatMessage[]): Promise<string> {
    const { apiKey, model } = this.readConfig();
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: 0.1,
      stream: false
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
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

  private readConfig(): { apiKey: string; model: string } {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Falta la variable de entorno OPENROUTER_API_KEY. Configúrala antes de usar el extractor de imágenes."
      );
    }
    return {
      apiKey,
      model: process.env.IMAGE_EXTRACTION_MODEL ?? "qwen/qwen3-vl-32b-instruct"
    };
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
