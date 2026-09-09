import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateSubjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class SubjectDto {
  @IsUUID()
  id!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description!: string | null;

  @IsDateString()
  createdAt!: string;

  @IsDateString()
  updatedAt!: string;
}