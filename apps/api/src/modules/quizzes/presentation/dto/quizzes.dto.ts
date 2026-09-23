import { Type } from "class-transformer";
import {
  ApiProperty,
  ApiPropertyOptional
} from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested
} from "class-validator";

export class GenerateQuizDto {
  @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", description: "UUID de la materia del quiz" })
  @IsUUID()
  subjectId!: string;

  @ApiPropertyOptional({ example: "b2c3d4e5-f6a7-8901-bcde-f12345678901", description: "UUID del tema (opcional; sin tema el quiz abarca toda la materia)" })
  @IsOptional()
  @IsUUID()
  topicId?: string;
}

export class SubmitAnswerDto {
  @ApiProperty({ example: "c3d4e5f6-a7b8-9012-cdef-123456789012", description: "UUID de la pregunta" })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ example: "d4e5f6a7-b8c9-0123-def0-123456789013", description: "UUID de la opción elegida" })
  @IsUUID()
  selectedOptionId!: string;
}

export class SubmitAttemptDto {
  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", description: "Momento en que el usuario inició el quiz" })
  @IsDateString()
  startedAt!: string;

  @ApiProperty({ type: () => [SubmitAnswerDto], description: "Respuestas del quiz" })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  answers!: SubmitAnswerDto[];
}

export class QuizOptionDto {
  @ApiProperty({ example: "e5f6a7b8-c9d0-1123-ef0a-123456789014", description: "UUID de la opción" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "La fotosíntesis", description: "Texto de la opción" })
  @IsString()
  text!: string;
}

export class QuizQuestionDto {
  @ApiProperty({ example: "c3d4e5f6-a7b8-9012-cdef-123456789012", description: "UUID de la pregunta" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "¿Qué convierte la luz en energía química?", description: "Enunciado de la pregunta" })
  @IsString()
  statement!: string;

  @ApiPropertyOptional({
    example: "/materials/abc-123/images/def-456",
    description: "Ruta de la imagen del enunciado (null si la pregunta no tiene imagen)",
    nullable: true
  })
  @IsOptional()
  @IsString()
  imageUrl!: string | null;

  @ApiProperty({ type: () => [QuizOptionDto], description: "Opciones de respuesta (sin marcar la correcta)" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options!: QuizOptionDto[];
}

export class QuizDto {
  @ApiProperty({ example: "f6a7b8c9-d0e1-2234-ab01-23456789015", description: "UUID del quiz" })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: "Quiz de Biología", description: "Título del quiz" })
  @IsString()
  title!: string;

  @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", description: "UUID de la materia" })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ example: "Biología", description: "Nombre de la materia" })
  @IsString()
  subjectName!: string;

  @ApiPropertyOptional({ example: "b2c3d4e5-f6a7-8901-bcde-f12345678901", description: "UUID del tema (null si abarca la materia completa)", nullable: true })
  @IsOptional()
  @IsUUID()
  topicId!: string | null;

  @ApiPropertyOptional({ example: "Fotosíntesis", description: "Nombre del tema (null si abarca la materia completa)", nullable: true })
  @IsOptional()
  @IsString()
  topicName!: string | null;

  @ApiProperty({ type: () => [QuizQuestionDto], description: "Preguntas del quiz en orden de presentación" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions!: QuizQuestionDto[];

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", description: "Fecha de creación" })
  @IsDateString()
  createdAt!: string;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", description: "Fecha de última actualización" })
  @IsDateString()
  updatedAt!: string;
}

export class QuizAnswerFeedbackDto {
  @ApiProperty({ example: "c3d4e5f6-a7b8-9012-cdef-123456789012", description: "UUID de la pregunta" })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ example: "¿Qué convierte la luz en energía química?", description: "Enunciado de la pregunta" })
  @IsString()
  statement!: string;

  @ApiProperty({ example: "d4e5f6a7-b8c9-0123-def0-123456789013", description: "UUID de la opción elegida" })
  @IsUUID()
  selectedOptionId!: string;

  @ApiProperty({ example: "e5f6a7b8-c9d0-1123-ef0a-123456789014", description: "UUID de la opción correcta" })
  @IsUUID()
  correctOptionId!: string;

  @ApiProperty({ example: true, description: "Indica si la respuesta fue correcta" })
  @IsBoolean()
  isCorrect!: boolean;

  @ApiPropertyOptional({ example: "La luz se convierte en energía química mediante la clorofila.", description: "Explicación de la respuesta", nullable: true })
  @IsOptional()
  @IsString()
  explanation!: string | null;
}

export class QuizAttemptResultDto {
  @ApiProperty({ example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", description: "UUID del intento" })
  @IsUUID()
  attemptId!: string;

  @ApiProperty({ example: "f6a7b8c9-d0e1-2234-ab01-23456789015", description: "UUID del quiz" })
  @IsUUID()
  quizId!: string;

  @ApiProperty({ example: 67, description: "Porcentaje de aciertos (0-100)" })
  @IsNumber()
  score!: number;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", description: "Inicio del intento" })
  @IsDateString()
  startedAt!: string;

  @ApiProperty({ example: "2026-09-11T12:03:00.000Z", description: "Fin del intento" })
  @IsDateString()
  completedAt!: string;

  @ApiProperty({ type: () => [QuizAnswerFeedbackDto], description: "Retroalimentación por pregunta" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerFeedbackDto)
  answers!: QuizAnswerFeedbackDto[];
}