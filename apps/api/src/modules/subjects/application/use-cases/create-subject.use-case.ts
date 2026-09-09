import { Injectable } from "@nestjs/common";

import {
  CreateSubjectInput,
  SubjectRecord,
  SubjectRepository
} from "../ports/subject.repository";

@Injectable()
export class CreateSubjectUseCase {
  constructor(private readonly repository: SubjectRepository) {}

  execute(input: CreateSubjectInput): Promise<SubjectRecord> {
    return this.repository.create(input);
  }
}