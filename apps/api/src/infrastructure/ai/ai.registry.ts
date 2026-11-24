import { Injectable } from "@nestjs/common";

import {
  AIProvider,
  AIProviderId,
  AIProviderRegistry
} from "../../modules/ai/application/ports/ai-provider";
import { DeepSeekProvider } from "./deepseek/deepseek.provider";
import { OpenRouterProvider } from "./openrouter/openrouter.provider";

@Injectable()
export class CommonAIProviderRegistry implements AIProviderRegistry {
  constructor(
    private readonly deepSeekProvider: DeepSeekProvider,
    private readonly openRouterProvider: OpenRouterProvider
  ) {}

  get(provider: AIProviderId): AIProvider {
    switch (provider) {
      case "deepseek":
        return this.deepSeekProvider;
      case "openrouter":
        return this.openRouterProvider;
      default:
        throw new Error(`Proveedor de IA no soportado: ${provider}`);
    }
  }
}

export function resolveAIProviderId(): AIProviderId {
  const raw = process.env.AI_PROVIDER ?? "deepseek";
  if (raw !== "deepseek" && raw !== "openrouter") {
    throw new Error(`Proveedor de IA no soportado en AI_PROVIDER: ${raw}`);
  }
  return raw;
}
