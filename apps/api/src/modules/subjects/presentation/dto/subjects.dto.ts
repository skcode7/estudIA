import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength
} from "class-validator";

import { SUBJECT_COLORS, SUBJECT_ICONS } from "../../application/ports/subject.repository";

export class CreateSubjectDto {
  @ApiProperty({ example: "Matemáticas", description: "Nombre de la materia", minLength: 1, maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: "Álgebra y geometría", description: "Descripción de la materia", maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: "violet",
    description: "Paleta de color de la materia",
    enum: SUBJECT_COLORS
  })
  @IsOptional()
  @IsString()
  @IsIn(SUBJECT_COLORS)
  color?: string;

  @ApiPropertyOptional({
    example: "subjects",
    description: "Ícono de la materia",
    enum: SUBJECT_ICONS
  })
  @IsOptional()
  @IsString()
  @IsIn(SUBJECT_ICONS)
  icon?: string;
}

export class UpdateSubjectDto {
  @ApiPropertyOptional({ example: "Matemáticas II", description: "Nombre actualizado de la materia", minLength: 1, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: "Cálculo diferencial e integral", description: "Descripción actualizada de la materia", maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: "violet",
    description: "Paleta de color de la materia",
    enum: SUBJECT_COLORS
  })
  @IsOptional()
  @IsString()
  @IsIn(SUBJECT_COLORS)
  color?: string;

  @ApiPropertyOptional({
    example: "subjects",
    description: "Ícono de la materia",
    enum: SUBJECT_ICONS
  })
  @IsOptional()
  @IsString()
  @IsIn(SUBJECT_ICONS)
  icon?: string;
}

export class SubjectDto {
  @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", description: "UUID de la materia" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "Matemáticas", description: "Nombre de la materia" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: "Álgebra y geometría", description: "Descripción de la materia", nullable: true })
  @IsOptional()
  @IsString()
  description!: string | null;

  @ApiProperty({ example: "violet", description: "Paleta de color de la materia" })
  @IsString()
  color!: string;

  @ApiProperty({ example: "subjects", description: "Ícono de la materia" })
  @IsString()
  icon!: string;

  @ApiProperty({ example: 12, description: "Número total de materiales de la materia (a través de sus temas)" })
  materialsCount!: number;

  @ApiPropertyOptional({
    example: 75,
    description: "Progreso promedio de la materia (0-100). `null` cuando aún no hay intentos de quiz.",
    nullable: true
  })
  progress!: number | null;

  @ApiProperty({ example: "2026-09-10T12:00:00.000Z", description: "Fecha de creación" })
  @IsDateString()
  createdAt!: string;

  @ApiProperty({ example: "2026-09-10T12:00:00.000Z", description: "Fecha de última actualización" })
  @IsDateString()
  updatedAt!: string;
}
