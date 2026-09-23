import { Global, Module } from "@nestjs/common";

import { AIProvider, AIProviderRegistry } from "./application/ports/ai-provider";
import { MaterialImageExtractor } from "./application/ports/image-extractor";
import { CommonAIProviderRegistry, resolveAIProviderId } from "../../infrastructure/ai/ai.registry";
import { DeepSeekClient } from "../../infrastructure/ai/deepseek/deepseek.client";
import { DeepSeekProvider } from "../../infrastructure/ai/deepseek/deepseek.provider";
import { NoopMaterialImageExtractor } from "../../infrastructure/ai/noop.image-extractor";
import { OpenRouterClient } from "../../infrastructure/ai/openrouter/openrouter.client";
import { OpenRouterImageExtractor } from "../../infrastructure/ai/openrouter/openrouter.image-extractor";

@Global()
@Module({
  providers: [
    DeepSeekClient,
    DeepSeekProvider,
    OpenRouterClient,
    { provide: AIProviderRegistry, useClass: CommonAIProviderRegistry },
    {
      provide: AIProvider,
      inject: [AIProviderRegistry],
      useFactory: (registry: AIProviderRegistry): AIProvider =>
        registry.get(resolveAIProviderId())
    },
    {
      provide: MaterialImageExtractor,
      inject: [OpenRouterClient],
      useFactory: (client: OpenRouterClient): MaterialImageExtractor =>
        process.env.OPENROUTER_API_KEY
          ? new OpenRouterImageExtractor(client)
          : new NoopMaterialImageExtractor()
    }
  ],
  exports: [AIProvider, AIProviderRegistry, MaterialImageExtractor]
})
export class AIModule {}