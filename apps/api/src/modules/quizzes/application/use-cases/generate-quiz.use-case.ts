import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { SubjectRepository } from "../../../subjects/application/ports/subject.repository";
import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import { QuizRecord, QuizRepository } from "../ports/quiz.repository";
import { shuffle } from "../../../../shared/random.utils";

export interface GenerateQuizInput {
  subjectId: string;
  topicId?: string | null;
}

export const GENERATE_QUIZ_CONFIG = "GENERATE_QUIZ_CONFIG";

export interface GenerateQuizConfig {
  questionsCount: number;
}

@Injectable()
export class GenerateQuizUseCase {
  constructor(
    private readonly subjectRepository: SubjectRepository,
    private readonly topicRepository: TopicRepository,
    private readonly quizRepository: QuizRepository,
    @Inject(GENERATE_QUIZ_CONFIG) private readonly config: GenerateQuizConfig
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

    const selectedIds = shuffle(questionIds).slice(0, this.config.questionsCount);
    return this.quizRepository.createQuiz({
      title,
      subjectId: subject.id,
      topicId: input.topicId ?? null,
      questionIds: selectedIds
    });
  }
}