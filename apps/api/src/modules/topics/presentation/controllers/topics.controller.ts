import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { CreateTopicUseCase } from "../../application/use-cases/create-topic.use-case";
import { DeleteTopicUseCase } from "../../application/use-cases/delete-topic.use-case";
import { GetTopicUseCase } from "../../application/use-cases/get-topic.use-case";
import { ListTopicsUseCase } from "../../application/use-cases/list-topics.use-case";
import { UpdateTopicUseCase } from "../../application/use-cases/update-topic.use-case";
import { TopicRecord } from "../../application/ports/topic.repository";
import { CreateTopicDto, TopicDto, UpdateTopicDto } from "../dto/topics.dto";

@Controller("topics")
export class TopicsController {
  constructor(
    private readonly createTopicUseCase: CreateTopicUseCase,
    private readonly listTopicsUseCase: ListTopicsUseCase,
    private readonly getTopicUseCase: GetTopicUseCase,
    private readonly updateTopicUseCase: UpdateTopicUseCase,
    private readonly deleteTopicUseCase: DeleteTopicUseCase
  ) {}

  @Post()
  create(@Body() dto: CreateTopicDto): Promise<TopicDto> {
    return this.createTopicUseCase
      .execute({ subjectId: dto.subjectId, name: dto.name, description: dto.description })
      .then(toTopicDto);
  }

  @Get()
  findAll(@Query("subjectId") subjectId?: string): Promise<TopicDto[]> {
    return this.listTopicsUseCase.execute(subjectId).then((topics) => topics.map(toTopicDto));
  }

  @Get(":id")
  findOne(@Param("id") id: string): Promise<TopicDto> {
    return this.getTopicUseCase.execute(id).then(toTopicDto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTopicDto): Promise<TopicDto> {
    return this.updateTopicUseCase.execute(id, dto).then(toTopicDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string): Promise<void> {
    return this.deleteTopicUseCase.execute(id);
  }
}

function toTopicDto(topic: TopicRecord): TopicDto {
  return {
    id: topic.id,
    subjectId: topic.subjectId,
    name: topic.name,
    description: topic.description,
    createdAt: topic.createdAt.toISOString(),
    updatedAt: topic.updatedAt.toISOString()
  };
}