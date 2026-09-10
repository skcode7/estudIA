import { Injectable, NotFoundException } from "@nestjs/common";

import {
  SubjectRecord,
  SubjectRepository,
  UpdateSubjectInput
} from "../ports/subject.repository";

@Injectable()
export class UpdateSubjectUseCase {
  constructor(private readonly repository: SubjectRepository) {}

  async execute(id: string, input: UpdateSubjectInput): Promise<SubjectRecord> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Materia con id "${id}" no encontrada.`);
    }
    return this.repository.update(id, input);
  }
}
