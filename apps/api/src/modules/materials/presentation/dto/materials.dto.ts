import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested
} from "class-validator";

export enum MaterialTypeDto {
  TEXT = "TEXT",
  FILE = "FILE",
  LINK = "LINK"
}

export class CreateTextMaterialDto {
  @ApiProperty({ example: "b2c3d4e5-f6a7-8901-bcde-f12345678901", description: "UUID del tema al que pertenece el material" })
  @IsUUID()
  topicId!: string;

  @ApiProperty({ example: "Apuntes de la unidad 1", description: "Título del material", minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: "Contenido completo del apunte…", description: "Contenido en texto del material" })
  @IsString()
  @MinLength(1)
  content!: string;
}

export class UploadMaterialDto {
  @ApiProperty({ example: "b2c3d4e5-f6a7-8901-bcde-f12345678901", description: "UUID del tema al que pertenece el material" })
  @IsUUID()
  topicId!: string;

  @ApiPropertyOptional({ example: "Foto apunte álgebra.jpg", description: "Título opcional; por defecto usa el nombre del archivo", maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    example: "Texto extraído de la foto de los apuntes…",
    description: "Contenido en texto del material (transcripción extraída o editada por el usuario)",
    maxLength: 200000
  })
  @IsOptional()
  @IsString()
  @MaxLength(200000)
  content?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      "Marca si la foto contiene figuras propias (banderas, mapas, diagramas…) según el análisis del borrador"
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  hasEmbeddedFigures?: boolean;
}

export class AnalyzeMaterialDraftDto {
  @ApiPropertyOptional({
    example: "Apuntes sobre la fotosíntesis…",
    description: "Texto del material a analizar (alternativo al archivo \"file\")"
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200000)
  text?: string;
}

export class MaterialDraftDto {
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
    example: "Apuntes de la unidad 1",
    description: "Título sugerido para el material",
    nullable: true
  })
  @IsOptional()
  @IsString()
  suggestedTitle!: string | null;

  @ApiPropertyOptional({
    example: "Texto completo transcrito de los apuntes…",
    description: "Contenido en texto extraído del material",
    nullable: true
  })
  @IsOptional()
  @IsString()
  extractedContent!: string | null;

  @ApiProperty({
    example: true,
    description:
      "Marca si la foto contiene figuras propias (banderas, mapas, diagramas…) además del texto"
  })
  @IsBoolean()
  hasEmbeddedFigures!: boolean;
}

export class MaterialDto {
  @ApiProperty({ example: "c3d4e5f6-a7b8-9012-cdef-234567890123", description: "UUID del material" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "b2c3d4e5-f6a7-8901-bcde-f12345678901", description: "UUID del tema" })
  @IsUUID()
  topicId!: string;

  @ApiProperty({ enum: MaterialTypeDto, description: "Tipo de material" })
  @IsEnum(MaterialTypeDto)
  type!: MaterialTypeDto;

  @ApiProperty({ example: "Apuntes de la unidad 1", description: "Título del material" })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: "Contenido en texto del material…", description: "Contenido textual (TEXT)", nullable: true })
  @IsOptional()
  @IsString()
  content!: string | null;

  @ApiPropertyOptional({
    example: "topics/b2c3d4e5-f6a7-8901-bcde-f12345678901/materials/abc.jpg",
    description: "Clave del objeto en el almacenamiento (FILE)",
    nullable: true
  })
  @IsOptional()
  @IsString()
  storageKey!: string | null;

  @ApiProperty({
    example: true,
    description:
      "Marca si el material contiene figuras propias (banderas, mapas, diagramas…) además del texto"
  })
  @IsBoolean()
  hasEmbeddedFigures!: boolean;

  @ApiProperty({ example: "PENDING", enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"], description: "Estado del procesamiento IA" })
  @IsEnum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"])
  processingStatus!: string;

  @ApiPropertyOptional({ example: "Error del proveedor", description: "Error de procesamiento si ocurrió", nullable: true })
  @IsOptional()
  @IsString()
  processingError!: string | null;

  @ApiProperty({ example: 3, description: "Cantidad de preguntas generadas (0 si no hay procesamiento completado)" })
  questionCount!: number;

  @ApiProperty({ example: "2026-09-10T12:00:00.000Z", description: "Fecha de creación" })
  @IsDateString()
  createdAt!: string;

  @ApiProperty({ example: "2026-09-10T12:00:00.000Z", description: "Fecha de última actualización" })
  @IsDateString()
  updatedAt!: string;
}

export class UpdateMaterialDto {
  @ApiPropertyOptional({ example: "Apuntes de la unidad 1", description: "Título del material", minLength: 1, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: "Contenido revisado del material…", description: "Contenido en texto del material", minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;
}

export class MaterialQuestionOptionDto {
  @ApiProperty({ example: "d4e5f6a7-b8c9-0123-def0-123456789013", description: "UUID de la opción" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "París", description: "Texto de la opción" })
  @IsString()
  text!: string;

  @ApiProperty({ example: true, description: "Si esta opción es la correcta" })
  @IsBoolean()
  isCorrect!: boolean;
}

export class MaterialQuestionDto {
  @ApiProperty({ example: "c3d4e5f6-a7b8-9012-cdef-123456789012", description: "UUID de la pregunta" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "¿Cuál es la capital de Francia?", description: "Enunciado" })
  @IsString()
  statement!: string;

  @ApiPropertyOptional({ example: "París es la capital.", nullable: true })
  @IsOptional()
  @IsString()
  explanation!: string | null;

  @ApiProperty({ example: "medium" })
  @IsString()
  difficulty!: string;

  @ApiPropertyOptional({ example: "e5f6a7b8-c9d0-1234-ef01-234567890145", nullable: true })
  @IsOptional()
  @IsString()
  imageId!: string | null;

  @ApiProperty({ type: () => [MaterialQuestionOptionDto] })
  options!: MaterialQuestionOptionDto[];
}

export class UpdateMaterialQuestionOptionDto {
  @ApiProperty({ example: "París", description: "Texto de la opción" })
  @IsString()
  @MinLength(1)
  text!: string;

  @ApiProperty({ example: true, description: "Si esta opción es la correcta" })
  @IsBoolean()
  isCorrect!: boolean;
}

export class UpdateMaterialQuestionDto {
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
  imageId!: string | null;

  @ApiProperty({ type: () => [UpdateMaterialQuestionOptionDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => UpdateMaterialQuestionOptionDto)
  options!: UpdateMaterialQuestionOptionDto[];
}

export class MaterialImageDto {
  @ApiProperty({ example: "e5f6a7b8-c9d0-1234-ef01-234567890145" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "Bandera de Francia" })
  @IsString()
  label!: string;

  @ApiProperty({ example: 0 })
  order!: number;
}