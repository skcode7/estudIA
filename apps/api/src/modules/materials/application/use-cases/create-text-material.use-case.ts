import { Injectable, NotFoundException } from "@nestjs/common";

import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import {
  CreateMaterialInput,
  MaterialRecord,
  MaterialRepository
} from "../ports/material.repository";

@Injectable()
export class CreateTextMaterialUseCase {
  constructor(
    private readonly repository: MaterialRepository,
    private readonly topicRepository: TopicRepository
  ) {}

  async execute(input: CreateMaterialInput): Promise<MaterialRecord> {
    const topic = await this.topicRepository.findById(input.topicId);
    if (!topic) {
      throw new NotFoundException(`Tema con id "${input.topicId}" no encontrado.`);
    }
    return this.repository.create(input);
  }
}