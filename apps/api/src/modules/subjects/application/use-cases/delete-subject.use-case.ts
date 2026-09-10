import { Injectable, NotFoundException } from "@nestjs/common";

import { SubjectRepository } from "../ports/subject.repository";

@Injectable()
export class DeleteSubjectUseCase {
  constructor(private readonly repository: SubjectRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Materia con id "${id}" no encontrada.`);
    }
    return this.repository.delete(id);
  }
}
