import { Injectable } from "@nestjs/common";

import { TopicRecord, TopicRepository } from "../ports/topic.repository";

@Injectable()
export class ListTopicsUseCase {
  constructor(private readonly repository: TopicRepository) {}

  execute(subjectId?: string): Promise<TopicRecord[]> {
    return this.repository.findAll({ subjectId });
  }
}