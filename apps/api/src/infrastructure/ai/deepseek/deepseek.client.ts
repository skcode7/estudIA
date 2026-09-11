import { Injectable } from "@nestjs/common";

import { ChatMessage } from "./deepseek.prompts";

export class DeepSeekClientError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DeepSeekClientError";
    this.status = status;
  }
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

@Injectable()
export class DeepSeekClient {
  private readonly baseUrl = "https://api.deepseek.com";

  async chat(messages: ChatMessage[], options: { json?: boolean } = {}): Promise<string> {
    const { apiKey, model } = this.readConfig();
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: 0.2,
      stream: false
    };
    if (options.json !== false) {
      body.response_format = { type: "json_object" };
    }

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
      throw new DeepSeekClientError(
        response.status,
        `DeepSeek respondió con error ${response.status}: ${detail}`
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new DeepSeekClientError(200, "DeepSeek no devolvió contenido en la respuesta.");
    }
    return content;
  }

  private readConfig(): { apiKey: string; model: string } {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Falta la variable de entorno DEEPSEEK_API_KEY. Configúrala antes de usar el proveedor de IA."
      );
    }
    return { apiKey, model: process.env.DEEPSEEK_MODEL ?? "deepseek-flash" };
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