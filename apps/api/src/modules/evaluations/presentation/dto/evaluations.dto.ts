import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested
} from "class-validator";

export enum EvaluationProcessingStatusDto {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED"
}

export enum EvaluationQuestionTypeDto {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
  FILL_BLANK = "FILL_BLANK"
}

export class AnalyzeEvaluationDraftDto {
  @ApiPropertyOptional({
    example: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    description: "Materia ya elegida: acota la propuesta a sus temas"
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string;
}

export class EvaluationDraftDto {
  @ApiPropertyOptional({
    example: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    description: "UUID sugerido de la materia (solo entre las existentes; null si no hay match)",
    nullable: true
  })
  @IsOptional()
  @IsString()
  suggestedSubjectId!: string | null;

  @ApiPropertyOptional({
    example: "c3d4e5f6-a7b8-9012-cdef-234567890123",
    description: "UUID sugerido del tema (solo entre los existentes; null si no hay match)",
    nullable: true
  })
  @IsOptional()
  @IsString()
  suggestedTopicId!: string | null;

  @ApiPropertyOptional({
    example: "Examen de la unidad 1",
    description: "Título sugerido para la evaluación",
    nullable: true
  })
  @IsOptional()
  @IsString()
  suggestedTitle!: string | null;
}

export class UploadEvaluationDto {
  @ApiProperty({ example: "c3d4e5f6-a7b8-9012-cdef-234567890123", description: "UUID del tema al que pertenece la evaluación" })
  @IsUUID()
  topicId!: string;

  @ApiProperty({ example: "Examen de la unidad 1", description: "Título de la evaluación", minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: "2026-05-14", description: "Fecha en que se realizó la evaluación", nullable: true })
  @IsOptional()
  @IsDateString()
  dateTaken?: string | null;
}

export class EvaluationDto {
  @ApiProperty({ example: "f7a8b9c0-d1e2-3456-7890-abcdef123456" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "c3d4e5f6-a7b8-9012-cdef-234567890123" })
  @IsUUID()
  topicId!: string;

  @ApiProperty({ example: "Examen de la unidad 1" })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: "2026-05-14T00:00:00.000Z", nullable: true })
  @IsOptional()
  @IsDateString()
  dateTaken!: string | null;

  @ApiProperty({ enum: EvaluationProcessingStatusDto, description: "Estado del procesamiento con IA" })
  @IsEnum(EvaluationProcessingStatusDto)
  processingStatus!: EvaluationProcessingStatusDto;

  @ApiPropertyOptional({ example: "No se pudo leer ninguna foto", nullable: true })
  @IsOptional()
  @IsString()
  processingError!: string | null;

  @ApiProperty({ example: 2, description: "Cantidad de fotos de la evaluación" })
  @IsInt()
  @Min(0)
  imageCount!: number;

  @ApiProperty({ example: 8, description: "Preguntas extraídas que están en el pool" })
  @IsInt()
  @Min(0)
  questionCount!: number;

  @ApiProperty({ example: "2026-10-01T12:00:00.000Z" })
  @IsDateString()
  createdAt!: string;

  @ApiProperty({ example: "2026-10-01T12:05:00.000Z" })
  @IsDateString()
  updatedAt!: string;
}

export class EvaluationQuestionOptionDto {
  @ApiProperty({ example: "d4e5f6a7-b8c9-0123-def0-123456789013" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "París" })
  @IsString()
  text!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCorrect!: boolean;
}

export class EvaluationQuestionDto {
  @ApiProperty({ example: "c3d4e5f6-a7b8-9012-cdef-123456789012" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "b2c3d4e5-f6a7-8901-bcde-f12345678901", description: "Tema al que quedó asignada" })
  @IsUUID()
  topicId!: string;

  @ApiProperty({ enum: EvaluationQuestionTypeDto, description: "Tipo de pregunta" })
  @IsEnum(EvaluationQuestionTypeDto)
  type!: EvaluationQuestionTypeDto;

  @ApiProperty({ example: "¿Cuál es la capital de Francia?" })
  @IsString()
  statement!: string;

  @ApiPropertyOptional({ example: "París es la capital.", nullable: true })
  @IsOptional()
  @IsString()
  explanation!: string | null;

  @ApiProperty({ example: "medium" })
  @IsString()
  difficulty!: string;

  @ApiPropertyOptional({ example: "e5f6a7b8-c9d0-1234-ef01-234567890145", description: "Foto de la que sale la pregunta", nullable: true })
  @IsOptional()
  @IsString()
  evaluationImageId!: string | null;

  @ApiProperty({ type: () => [EvaluationQuestionOptionDto] })
  @IsArray()
  options!: EvaluationQuestionOptionDto[];
}

export class UpdateEvaluationQuestionOptionDto {
  @ApiProperty({ example: "París" })
  @IsString()
  @MinLength(1)
  text!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCorrect!: boolean;
}

export class UpdateEvaluationQuestionDto {
  @ApiPropertyOptional({
    example: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    description: "Reclasifica la pregunta a otro tema de la misma materia",
    nullable: true
  })
  @IsOptional()
  @IsUUID()
  topicId?: string;

  @ApiPropertyOptional({
    enum: EvaluationQuestionTypeDto,
    description: "Cambia el tipo de la pregunta",
    nullable: true
  })
  @IsOptional()
  @IsEnum(EvaluationQuestionTypeDto)
  type?: EvaluationQuestionTypeDto;

  @ApiProperty({ example: "¿Cuál es la capital de Francia?", minLength: 1 })
  @IsString()
  @MinLength(1)
  statement!: string;

  @ApiPropertyOptional({ example: "París es la capital.", nullable: true })
  @IsOptional()
  @IsString()
  explanation?: string | null;

  @ApiProperty({ example: "medium", enum: ["easy", "medium", "hard"] })
  @IsIn(["easy", "medium", "hard"])
  difficulty!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsUUID()
  evaluationImageId!: string | null;

  @ApiProperty({ type: () => [UpdateEvaluationQuestionOptionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => UpdateEvaluationQuestionOptionDto)
  options!: UpdateEvaluationQuestionOptionDto[];
}
