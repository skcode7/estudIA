import { Injectable } from "@nestjs/common";

import {
  AIProvider,
  AIProviderId,
  AIProviderRegistry
} from "../../modules/ai/application/ports/ai-provider";
import { DeepSeekProvider } from "./deepseek/deepseek.provider";

@Injectable()
export class CommonAIProviderRegistry implements AIProviderRegistry {
  constructor(private readonly deepSeekProvider: DeepSeekProvider) {}

  get(provider: AIProviderId): AIProvider {
    switch (provider) {
      case "deepseek":
        return this.deepSeekProvider;
      default:
        throw new Error(`Proveedor de IA no soportado: ${provider}`);
    }
  }
}

export function resolveAIProviderId(): AIProviderId {
  const raw = process.env.AI_PROVIDER ?? "deepseek";
  if (raw !== "deepseek") {
    throw new Error(`Proveedor de IA no soportado en AI_PROVIDER: ${raw}`);
  }
  return raw;
}