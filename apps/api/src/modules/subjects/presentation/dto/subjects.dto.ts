import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

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

  @ApiProperty({ example: "2026-09-10T12:00:00.000Z", description: "Fecha de creación" })
  @IsDateString()
  createdAt!: string;

  @ApiProperty({ example: "2026-09-10T12:00:00.000Z", description: "Fecha de última actualización" })
  @IsDateString()
  updatedAt!: string;
}
