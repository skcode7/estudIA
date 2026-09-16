import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { SubjectRepository } from "../../../subjects/application/ports/subject.repository";
import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import { QuizRecord, QuizRepository } from "../ports/quiz.repository";

const DEFAULT_QUESTION_COUNT = 3;

export interface GenerateQuizInput {
  subjectId: string;
  topicId?: string | null;
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

    const selectedIds = pickRandom(questionIds, this.resolveQuestionCount());
    return this.quizRepository.createQuiz({
      title,
      subjectId: subject.id,
      topicId: input.topicId ?? null,
      questionIds: selectedIds
    });
  }

  private resolveQuestionCount(): number {
    const raw = process.env.QUIZ_QUESTIONS_COUNT ?? String(DEFAULT_QUESTION_COUNT);
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_QUESTION_COUNT;
  }
}

function pickRandom<T>(items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}