import { Global, Module } from "@nestjs/common";

import { AIProvider, AIProviderRegistry } from "./application/ports/ai-provider";
import { CommonAIProviderRegistry, resolveAIProviderId } from "../../infrastructure/ai/ai.registry";
import { DeepSeekClient } from "../../infrastructure/ai/deepseek/deepseek.client";
import { DeepSeekProvider } from "../../infrastructure/ai/deepseek/deepseek.provider";

@Global()
@Module({
  providers: [
    DeepSeekClient,
    DeepSeekProvider,
    { provide: AIProviderRegistry, useClass: CommonAIProviderRegistry },
    {
      provide: AIProvider,
      inject: [AIProviderRegistry],
      useFactory: (registry: AIProviderRegistry): AIProvider =>
        registry.get(resolveAIProviderId())
    }
  ],
  exports: [AIProvider, AIProviderRegistry]
})
export class AIModule {}