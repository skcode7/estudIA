import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateTopicDto {
  @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", description: "UUID de la materia a la que pertenece el tema" })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ example: "Ecuaciones de segundo grado", description: "Nombre del tema", minLength: 1, maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: "Fórmula general y casos particulares", description: "Descripción del tema", maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateTopicDto {
  @ApiPropertyOptional({ example: "Ecuaciones de segundo grado (repaso)", description: "Nombre actualizado del tema", minLength: 1, maxLength: 160 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ example: "Fórmula general y casos particulares", description: "Descripción actualizada del tema", maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class TopicDto {
  @ApiProperty({ example: "b2c3d4e5-f6a7-8901-bcde-f12345678901", description: "UUID del tema" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", description: "UUID de la materia" })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ example: "Ecuaciones de segundo grado", description: "Nombre del tema" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: "Fórmula general y casos particulares", description: "Descripción del tema", nullable: true })
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