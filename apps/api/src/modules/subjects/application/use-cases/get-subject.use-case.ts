import { Injectable, NotFoundException } from "@nestjs/common";

import {
  SubjectRecord,
  SubjectRepository
} from "../ports/subject.repository";

@Injectable()
export class GetSubjectUseCase {
  constructor(private readonly repository: SubjectRepository) {}

  async execute(id: string): Promise<SubjectRecord> {
    const subject = await this.repository.findById(id);
    if (!subject) {
      throw new NotFoundException(`Materia con id "${id}" no encontrada.`);
    }
    return subject;
  }
}
