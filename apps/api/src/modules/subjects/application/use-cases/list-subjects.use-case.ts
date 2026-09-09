import { Injectable } from "@nestjs/common";

import { SubjectRecord, SubjectRepository } from "../ports/subject.repository";

@Injectable()
export class ListSubjectsUseCase {
  constructor(private readonly repository: SubjectRepository) {}

  execute(): Promise<SubjectRecord[]> {
    return this.repository.findAll();
  }
}