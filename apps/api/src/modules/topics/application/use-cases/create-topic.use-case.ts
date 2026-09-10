import { Injectable, NotFoundException } from "@nestjs/common";

import { SubjectRepository } from "../../../subjects/application/ports/subject.repository";
import { CreateTopicInput, TopicRecord, TopicRepository } from "../ports/topic.repository";

@Injectable()
export class CreateTopicUseCase {
  constructor(
    private readonly repository: TopicRepository,
    private readonly subjectRepository: SubjectRepository
  ) {}

  async execute(input: CreateTopicInput): Promise<TopicRecord> {
    const subject = await this.subjectRepository.findById(input.subjectId);
    if (!subject) {
      throw new NotFoundException(`Materia con id "${input.subjectId}" no encontrada.`);
    }
    return this.repository.create(input);
  }
}