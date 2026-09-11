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
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { CreateFileMaterialUseCase } from "../../application/use-cases/create-file-material.use-case";
import { CreateTextMaterialUseCase } from "../../application/use-cases/create-text-material.use-case";
import { DeleteMaterialUseCase } from "../../application/use-cases/delete-material.use-case";
import { GetMaterialUseCase } from "../../application/use-cases/get-material.use-case";
import { ListMaterialsUseCase } from "../../application/use-cases/list-materials.use-case";
import { ProcessMaterialUseCase } from "../../application/use-cases/process-material.use-case";
import { UpdateMaterialUseCase } from "../../application/use-cases/update-material.use-case";
import { MaterialRecord } from "../../application/ports/material.repository";
import { MaterialQuestionRepository } from "../../application/ports/material-question.repository";
import {
  CreateTextMaterialDto,
  MaterialDto,
  MaterialTypeDto,
  UpdateMaterialDto,
  UploadMaterialDto
} from "../dto/materials.dto";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller("materials")
export class MaterialsController {
  constructor(
    private readonly createTextMaterialUseCase: CreateTextMaterialUseCase,
    private readonly createFileMaterialUseCase: CreateFileMaterialUseCase,
    private readonly listMaterialsUseCase: ListMaterialsUseCase,
    private readonly getMaterialUseCase: GetMaterialUseCase,
    private readonly deleteMaterialUseCase: DeleteMaterialUseCase,
    private readonly processMaterialUseCase: ProcessMaterialUseCase,
    private readonly updateMaterialUseCase: UpdateMaterialUseCase,
    private readonly questionRepository: MaterialQuestionRepository
  ) {}

  @Post()
  createText(@Body() dto: CreateTextMaterialDto): Promise<MaterialDto> {
    return this.createTextMaterialUseCase
      .execute({
        topicId: dto.topicId,
        type: MaterialTypeDto.TEXT,
        title: dto.title,
        content: dto.content
      })
      .then((material) => toMaterialDto(material, 0));
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE } }))
  uploadFile(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadMaterialDto
  ): Promise<MaterialDto> {
    if (!file) {
      throw new BadRequestException("El archivo es obligatorio en el campo \"file\".");
    }
    return this.createFileMaterialUseCase
      .execute({
        topicId: dto.topicId,
        title: dto.title?.trim() || file.originalname,
        originalName: file.originalname,
        contentType: file.mimetype,
        body: file.buffer
      })
      .then((material) => toMaterialDto(material, 0));
  }

  @Get()
  async findAll(@Query("topicId") topicId: string): Promise<MaterialDto[]> {
    if (!topicId) {
      throw new BadRequestException("El parámetro \"topicId\" es obligatorio.");
    }
    const materials = await this.listMaterialsUseCase.execute(topicId);
    const counts = await this.questionRepository.countByMaterials(materials.map((m) => m.id));
    return materials.map((material) => toMaterialDto(material, counts.get(material.id) ?? 0));
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<MaterialDto> {
    const material = await this.getMaterialUseCase.execute(id);
    const counts = await this.questionRepository.countByMaterials([id]);
    return toMaterialDto(material, counts.get(id) ?? 0);
  }

  @Post(":id/process")
  process(@Param("id") id: string): Promise<MaterialDto> {
    return this.processMaterialUseCase
      .execute(id)
      .then(({ material, questionCount }) => toMaterialDto(material, questionCount));
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateMaterialDto): Promise<MaterialDto> {
    if (dto.title === undefined && dto.content === undefined) {
      throw new BadRequestException("Debes enviar al menos \"title\" o \"content\".");
    }
    return this.updateMaterialUseCase
      .execute(id, { title: dto.title, content: dto.content })
      .then((material) =>
        this.questionRepository.countByMaterials([id]).then((counts) =>
          toMaterialDto(material, counts.get(id) ?? 0)
        )
      );
  }

  @Delete(":id")
  remove(@Param("id") id: string): Promise<void> {
    return this.deleteMaterialUseCase.execute(id);
  }
}

function toMaterialDto(material: MaterialRecord, questionCount: number): MaterialDto {
  return {
    id: material.id,
    topicId: material.topicId,
    type: material.type as MaterialTypeDto,
    title: material.title,
    content: material.content,
    storageKey: material.storageKey,
    processingStatus: material.processingStatus,
    processingError: material.processingError,
    questionCount,
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString()
  };
}