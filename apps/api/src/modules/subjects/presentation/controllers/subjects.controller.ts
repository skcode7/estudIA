import { Body, Controller, Get, Post } from "@nestjs/common";

import { CreateSubjectUseCase } from "../../application/use-cases/create-subject.use-case";
import { ListSubjectsUseCase } from "../../application/use-cases/list-subjects.use-case";
import { SubjectRecord } from "../../application/ports/subject.repository";
import { CreateSubjectDto, SubjectDto } from "../dto/subjects.dto";

@Controller("subjects")
export class SubjectsController {
  constructor(
    private readonly createSubjectUseCase: CreateSubjectUseCase,
    private readonly listSubjectsUseCase: ListSubjectsUseCase
  ) {}

  @Post()
  create(@Body() dto: CreateSubjectDto): Promise<SubjectDto> {
    return this.createSubjectUseCase
      .execute({ name: dto.name, description: dto.description })
      .then(toSubjectDto);
  }

  @Get()
  findAll(): Promise<SubjectDto[]> {
    return this.listSubjectsUseCase.execute().then((subjects) => subjects.map(toSubjectDto));
  }
}

function toSubjectDto(subject: SubjectRecord): SubjectDto {
  return {
    id: subject.id,
    name: subject.name,
    description: subject.description,
    createdAt: subject.createdAt.toISOString(),
    updatedAt: subject.updatedAt.toISOString()
  };
}