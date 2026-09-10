import { Injectable, NotFoundException } from "@nestjs/common";

import { TopicRepository } from "../ports/topic.repository";

@Injectable()
export class DeleteTopicUseCase {
  constructor(private readonly repository: TopicRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Tema con id "${id}" no encontrado.`);
    }
    return this.repository.delete(id);
  }
}