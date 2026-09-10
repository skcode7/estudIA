import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";

import { GetSubjectUseCase } from "../../application/use-cases/get-subject.use-case";
import { CreateSubjectUseCase } from "../../application/use-cases/create-subject.use-case";
import { ListSubjectsUseCase } from "../../application/use-cases/list-subjects.use-case";
import { UpdateSubjectUseCase } from "../../application/use-cases/update-subject.use-case";
import { DeleteSubjectUseCase } from "../../application/use-cases/delete-subject.use-case";
import { SubjectRecord } from "../../application/ports/subject.repository";
import { CreateSubjectDto, SubjectDto, UpdateSubjectDto } from "../dto/subjects.dto";

@Controller("subjects")
export class SubjectsController {
  constructor(
    private readonly createSubjectUseCase: CreateSubjectUseCase,
    private readonly listSubjectsUseCase: ListSubjectsUseCase,
    private readonly getSubjectUseCase: GetSubjectUseCase,
    private readonly updateSubjectUseCase: UpdateSubjectUseCase,
    private readonly deleteSubjectUseCase: DeleteSubjectUseCase
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

  @Get(":id")
  findOne(@Param("id") id: string): Promise<SubjectDto> {
    return this.getSubjectUseCase.execute(id).then(toSubjectDto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateSubjectDto): Promise<SubjectDto> {
    return this.updateSubjectUseCase.execute(id, dto).then(toSubjectDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string): Promise<void> {
    return this.deleteSubjectUseCase.execute(id);
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
