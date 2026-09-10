import { Injectable, NotFoundException } from "@nestjs/common";

import { TopicRecord, TopicRepository, UpdateTopicInput } from "../ports/topic.repository";

@Injectable()
export class UpdateTopicUseCase {
  constructor(private readonly repository: TopicRepository) {}

  async execute(id: string, input: UpdateTopicInput): Promise<TopicRecord> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Tema con id "${id}" no encontrado.`);
    }
    return this.repository.update(id, input);
  }
}