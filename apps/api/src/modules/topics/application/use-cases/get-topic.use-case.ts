import { Injectable, NotFoundException } from "@nestjs/common";

import { TopicRecord, TopicRepository } from "../ports/topic.repository";

@Injectable()
export class GetTopicUseCase {
  constructor(private readonly repository: TopicRepository) {}

  async execute(id: string): Promise<TopicRecord> {
    const topic = await this.repository.findById(id);
    if (!topic) {
      throw new NotFoundException(`Tema con id "${id}" no encontrado.`);
    }
    return topic;
  }
}