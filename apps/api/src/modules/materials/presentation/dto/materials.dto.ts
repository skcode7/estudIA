import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

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

  @ApiProperty({ example: "PENDING", enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"], description: "Estado del procesamiento IA" })
  @IsEnum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"])
  processingStatus!: string;

  @ApiPropertyOptional({ example: "Error del proveedor", description: "Error de procesamiento si ocurrió", nullable: true })
  @IsOptional()
  @IsString()
  processingError!: string | null;

  @ApiProperty({ example: "2026-09-10T12:00:00.000Z", description: "Fecha de creación" })
  @IsDateString()
  createdAt!: string;

  @ApiProperty({ example: "2026-09-10T12:00:00.000Z", description: "Fecha de última actualización" })
  @IsDateString()
  updatedAt!: string;
}