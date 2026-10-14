import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";

import { EvaluationQuestionRecord } from "../../application/ports/evaluation-question.repository";
import { EvaluationWithCounts } from "../../application/ports/evaluation.repository";
import { AnalyzeEvaluationDraftUseCase } from "../../application/use-cases/analyze-evaluation-draft.use-case";
import { CreateEvaluationUseCase } from "../../application/use-cases/create-evaluation.use-case";
import { DeleteEvaluationQuestionUseCase } from "../../application/use-cases/delete-evaluation-question.use-case";
import { DeleteEvaluationUseCase } from "../../application/use-cases/delete-evaluation.use-case";
import { GetEvaluationImageUseCase } from "../../application/use-cases/get-evaluation-image.use-case";
import { ListEvaluationQuestionsUseCase } from "../../application/use-cases/list-evaluation-questions.use-case";
import { ListEvaluationsUseCase } from "../../application/use-cases/list-evaluations.use-case";
import { ProcessEvaluationUseCase } from "../../application/use-cases/process-evaluation.use-case";
import { UpdateEvaluationQuestionUseCase } from "../../application/use-cases/update-evaluation-question.use-case";
import {
  AnalyzeEvaluationDraftDto,
  EvaluationDraftDto,
  EvaluationDto,
  EvaluationProcessingStatusDto,
  EvaluationQuestionDto,
  EvaluationQuestionTypeDto,
  UpdateEvaluationQuestionDto,
  UploadEvaluationDto
} from "../dto/evaluations.dto";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

@Controller("evaluations")
export class EvaluationsController {
  constructor(
    private readonly analyzeEvaluationDraftUseCase: AnalyzeEvaluationDraftUseCase,
    private readonly createEvaluationUseCase: CreateEvaluationUseCase,
    private readonly listEvaluationsUseCase: ListEvaluationsUseCase,
    private readonly processEvaluationUseCase: ProcessEvaluationUseCase,
    private readonly listEvaluationQuestionsUseCase: ListEvaluationQuestionsUseCase,
    private readonly updateEvaluationQuestionUseCase: UpdateEvaluationQuestionUseCase,
    private readonly deleteEvaluationQuestionUseCase: DeleteEvaluationQuestionUseCase,
    private readonly getEvaluationImageUseCase: GetEvaluationImageUseCase,
    private readonly deleteEvaluationUseCase: DeleteEvaluationUseCase
  ) {}

  @Post("analyze")
  @UseInterceptors(
    FilesInterceptor("files", MAX_FILES, { limits: { fileSize: MAX_FILE_SIZE } })
  )
  async analyzeDraft(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body() dto: AnalyzeEvaluationDraftDto
  ): Promise<EvaluationDraftDto> {
    const draft = await this.analyzeEvaluationDraftUseCase.execute({
      images: toAnalyzeImages(files),
      subjectId: dto.subjectId ?? null
    });
    return {
      suggestedSubjectId: draft.suggestedSubjectId,
      suggestedTopicId: draft.suggestedTopicId,
      suggestedTitle: draft.suggestedTitle
    };
  }

  @Post("upload")
  @UseInterceptors(
    FilesInterceptor("files", MAX_FILES, { limits: { fileSize: MAX_FILE_SIZE } })
  )
  upload(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body() dto: UploadEvaluationDto
  ): Promise<EvaluationDto> {
    const images = toUploadImages(files);
    if (images.length === 0) {
      throw new BadRequestException(
        `La evaluación necesita al menos una foto en el campo "files" (máximo ${MAX_FILES}).`
      );
    }
    return this.createEvaluationUseCase
      .execute({
        topicId: dto.topicId,
        title: dto.title,
        dateTaken: dto.dateTaken ?? null,
        images
      })
      .then((evaluation) =>
        toEvaluationDto({ evaluation, questionCount: 0, imageCount: images.length })
      );
  }

  @Get()
  async findAll(@Query("subjectId") subjectId: string): Promise<EvaluationDto[]> {
    const evaluations = await this.listEvaluationsUseCase.execute(subjectId);
    return evaluations.map(toEvaluationDto);
  }

  @Get(":id/questions")
  async listQuestions(@Param("id") id: string): Promise<EvaluationQuestionDto[]> {
    const questions = await this.listEvaluationQuestionsUseCase.execute(id);
    return questions.map(toEvaluationQuestionDto);
  }

  @Patch(":id/questions/:questionId")
  updateQuestion(
    @Param("id") id: string,
    @Param("questionId") questionId: string,
    @Body() dto: UpdateEvaluationQuestionDto
  ): Promise<EvaluationQuestionDto> {
    return this.updateEvaluationQuestionUseCase
      .execute(id, questionId, {
        topicId: dto.topicId,
        ...(dto.type ? { type: dto.type as EvaluationQuestionTypeDto } : {}),
        statement: dto.statement,
        explanation: dto.explanation ?? null,
        difficulty: dto.difficulty,
        evaluationImageId: dto.evaluationImageId,
        options: dto.options
      })
      .then(toEvaluationQuestionDto);
  }

  @Delete(":id/questions/:questionId")
  removeQuestion(
    @Param("id") id: string,
    @Param("questionId") questionId: string
  ): Promise<void> {
    return this.deleteEvaluationQuestionUseCase.execute(id, questionId);
  }

  @Get(":id/images/:imageId")
  async findImage(
    @Param("id") id: string,
    @Param("imageId") imageId: string,
    @Res({ passthrough: true }) response: Response
  ): Promise<StreamableFile> {
    const { body, mimeType } = await this.getEvaluationImageUseCase.execute(id, imageId);
    response.set({
      "Content-Type": mimeType,
      "Cache-Control": "private, max-age=86400"
    });
    return new StreamableFile(body);
  }

  @Post(":id/process")
  process(@Param("id") id: string): Promise<EvaluationDto> {
    return this.processEvaluationUseCase
      .execute(id)
      .then(({ evaluation, questionCount }) =>
        toEvaluationDto({ evaluation, questionCount, imageCount: 0 })
      );
  }

  @Delete(":id")
  remove(@Param("id") id: string): Promise<void> {
    return this.deleteEvaluationUseCase.execute(id);
  }
}

function toUploadImages(files: Express.Multer.File[] | undefined) {
  return (files ?? []).map((file) => ({
    contentType: file.mimetype,
    body: file.buffer,
    originalName: file.originalname
  }));
}

function toAnalyzeImages(files: Express.Multer.File[] | undefined) {
  return (files ?? []).map((file) => ({
    mimeType: file.mimetype,
    body: file.buffer,
    originalName: file.originalname
  }));
}

function toEvaluationDto({ evaluation, questionCount, imageCount }: EvaluationWithCounts): EvaluationDto {
  return {
    id: evaluation.id,
    topicId: evaluation.topicId,
    title: evaluation.title,
    dateTaken: evaluation.dateTaken ? evaluation.dateTaken.toISOString() : null,
    processingStatus: evaluation.processingStatus as EvaluationProcessingStatusDto,
    processingError: evaluation.processingError,
    imageCount,
    questionCount,
    createdAt: evaluation.createdAt.toISOString(),
    updatedAt: evaluation.updatedAt.toISOString()
  };
}

function toEvaluationQuestionDto(question: EvaluationQuestionRecord): EvaluationQuestionDto {
  return {
    id: question.id,
    topicId: question.topicId,
    type: question.type as EvaluationQuestionTypeDto,
    statement: question.statement,
    explanation: question.explanation,
    difficulty: question.difficulty,
    evaluationImageId: question.evaluationImageId,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect
    }))
  };
}
