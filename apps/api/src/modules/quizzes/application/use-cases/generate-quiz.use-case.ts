import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { SubjectRepository } from "../../../subjects/application/ports/subject.repository";
import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import { QuizRecord, QuizRepository } from "../ports/quiz.repository";
import { shuffle } from "../../../../shared/random.utils";

export type QuizSize = "SHORT" | "MEDIUM" | "LONG";

export interface GenerateQuizInput {
  subjectId: string;
  topicId?: string | null;
  size: QuizSize;
}

/** Porción del pool que cada duración se lleva. */
const SIZE_RATIOS: Record<QuizSize, number> = {
  SHORT: 0.3,
  MEDIUM: 0.5,
  LONG: 0.7
};

/**
 * Cuántas preguntas se toman del pool para la duración elegida, como porcentaje
 * del alcance. El suelo en 1 importa: con un pool de 2, el 30% da 0.6 y un
 * quiz de cero preguntas es un resultado inválido, no uno fácil.
 */
export function countForSize(poolSize: number, size: QuizSize): number {
  if (poolSize <= 0) return 0;
  const count = Math.round(poolSize * SIZE_RATIOS[size]);
  return Math.min(Math.max(count, 1), poolSize);
}

@Injectable()
export class GenerateQuizUseCase {
  constructor(
    private readonly subjectRepository: SubjectRepository,
    private readonly topicRepository: TopicRepository,
    private readonly quizRepository: QuizRepository
  ) {}

  async execute(input: GenerateQuizInput): Promise<QuizRecord> {
    const subject = await this.subjectRepository.findById(input.subjectId);
    if (!subject) {
      throw new NotFoundException(`Materia con id "${input.subjectId}" no encontrada.`);
    }

    let topicIds: string[];
    let title: string;

    if (input.topicId) {
      const topic = await this.topicRepository.findById(input.topicId);
      if (!topic) {
        throw new NotFoundException(`Tema con id "${input.topicId}" no encontrado.`);
      }
      if (topic.subjectId !== subject.id) {
        throw new BadRequestException("El tema no pertenece a la materia seleccionada.");
      }
      topicIds = [topic.id];
      title = `Quiz de ${subject.name} · ${topic.name}`;
    } else {
      const topics = await this.topicRepository.findAll({ subjectId: subject.id });
      topicIds = topics.map((topic) => topic.id);
      if (topicIds.length === 0) {
        throw new BadRequestException(
          `La materia "${subject.name}" no tiene temas. Crea un tema y añade materiales para generar un quiz.`
        );
      }
      title = `Quiz de ${subject.name}`;
    }

    const questionIds = await this.quizRepository.findQuestionIdsByTopics(topicIds);
    if (questionIds.length === 0) {
      throw new BadRequestException(
        "No hay preguntas disponibles para este contenido. Procesa materiales con IA para generarlas."
      );
    }

    const selectedIds = shuffle(questionIds).slice(0, countForSize(questionIds.length, input.size));
    return this.quizRepository.createQuiz({
      title,
      subjectId: subject.id,
      topicId: input.topicId ?? null,
      questionIds: selectedIds
    });
  }
}