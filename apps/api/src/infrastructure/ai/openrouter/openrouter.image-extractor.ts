import { Injectable } from "@nestjs/common";

import {
  ExtractedImageRegion,
  ExtractImageRegionsInput,
  MaterialImageExtractor
} from "../../../modules/ai/application/ports/image-extractor";
import { OpenRouterClient } from "./openrouter.client";
import { toExtractedImageRegions } from "./openrouter.mapper";
import { extractRegionsMessages } from "./openrouter.prompts";
import { extractedRegionsSchema } from "./openrouter.schemas";
import { parseModelJson } from "../model-output";

@Injectable()
export class OpenRouterImageExtractor implements MaterialImageExtractor {
  constructor(private readonly client: OpenRouterClient) {}

  isAvailable(): boolean {
    return true;
  }

  async extractRegions(input: ExtractImageRegionsInput): Promise<ExtractedImageRegion[]> {
    const raw = await this.client.chat(extractRegionsMessages(input));
    const payload = parseModelJson(extractedRegionsSchema, raw);
    return toExtractedImageRegions(payload, input.maxRegions);
  }
}
