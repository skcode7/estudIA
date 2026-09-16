import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SubjectRecord,
  SubjectRepository
} from "../../../subjects/application/ports/subject.repository";
import { TopicRecord, TopicRepository } from "../../../topics/application/ports/topic.repository";
import { QuizRecord, QuizRepository } from "../ports/quiz.repository";
import { GenerateQuizUseCase } from "./generate-quiz.use-case";

function subjectRepositoryMock(): SubjectRepository {
  return {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
}

function topicRepositoryMock(): TopicRepository {
  return {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
}

function quizRepositoryMock(): QuizRepository {
  return {
    findQuestionIdsByTopics: vi.fn(),
    createQuiz: vi.fn(),
    findQuizForGrading: vi.fn(),
    saveAttempt: vi.fn()
  };
}

function baseSubject(overrides: Partial<SubjectRecord> = {}): SubjectRecord {
  return {
    id: "subject-1",
    name: "Biología",
    description: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

function baseTopic(overrides: Partial<TopicRecord> = {}): TopicRecord {
  return {
    id: "topic-1",
    subjectId: "subject-1",
    name: "Fotosíntesis",
    description: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

function baseQuiz(overrides: Partial<QuizRecord> = {}): QuizRecord {
  return {
    id: "quiz-1",
    title: "Quiz de Biología · Fotosíntesis",
    subjectId: "subject-1",
    subjectName: "Biología",
    topicId: "topic-1",
    topicName: "Fotosíntesis",
    createdAt: new Date("2026-09-11T00:00:00.000Z"),
    updatedAt: new Date("2026-09-11T00:00:00.000Z"),
    questions: [
      {
        id: "question-1",
        statement: "¿Qué convierte la luz en energía química?",
        options: [
          { id: "option-1", text: "La fotosíntesis" },
          { id: "option-2", text: "La respiración" }
        ]
      }
    ],
    ...overrides
  };
}

describe("GenerateQuizUseCase", () => {
  beforeEach(() => {
    delete process.env.QUIZ_QUESTIONS_COUNT;
  });

  it("generates a quiz scoped to a topic of the subject", async () => {
    const subjects = subjectRepositoryMock();
    const topics = topicRepositoryMock();
    const quizzes = quizRepositoryMock();
    vi.mocked(subjects.findById).mockResolvedValue(baseSubject());
    vi.mocked(topics.findById).mockResolvedValue(baseTopic());
    vi.mocked(quizzes.findQuestionIdsByTopics).mockResolvedValue([
      "question-1",
      "question-2",
      "question-3",
      "question-4"
    ]);
    const quiz = baseQuiz();
    vi.mocked(quizzes.createQuiz).mockResolvedValue(quiz);

    const useCase = new GenerateQuizUseCase(subjects, topics, quizzes);
    const result = await useCase.execute({ subjectId: "subject-1", topicId: "topic-1" });

    expect(result).toEqual(quiz);
    expect(quizzes.createQuiz).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Quiz de Biología · Fotosíntesis",
        subjectId: "subject-1",
        topicId: "topic-1"
      })
    );
    const questionIds = vi.mocked(quizzes.createQuiz).mock.calls[0]![0].questionIds;
    expect(questionIds).toHaveLength(3);
    expect(new Set(questionIds).size).toBe(3);
    expect(questionIds.every((id) => ["question-1", "question-2", "question-3", "question-4"].includes(id))).toBe(
      true
    );
  });

  it("generates a single quiz across all topics when no topic is given", async () => {
    const subjects = subjectRepositoryMock();
    const topics = topicRepositoryMock();
    const quizzes = quizRepositoryMock();
    vi.mocked(subjects.findById).mockResolvedValue(baseSubject());
    vi.mocked(topics.findAll).mockResolvedValue([
      baseTopic({ id: "topic-1" }),
      baseTopic({ id: "topic-2" })
    ]);
    vi.mocked(quizzes.findQuestionIdsByTopics).mockResolvedValue(["question-1", "question-2"]);
    vi.mocked(quizzes.createQuiz).mockResolvedValue(baseQuiz({ topicId: null, topicName: null }));

    const useCase = new GenerateQuizUseCase(subjects, topics, quizzes);
    const result = await useCase.execute({ subjectId: "subject-1" });

    expect(result.topicId).toBeNull();
    expect(topics.findAll).toHaveBeenCalledWith({ subjectId: "subject-1" });
    expect(quizzes.findQuestionIdsByTopics).toHaveBeenCalledWith(["topic-1", "topic-2"]);
    expect(quizzes.createQuiz).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Quiz de Biología", topicId: null })
    );
  });

  it("throws NotFoundException when the subject does not exist", async () => {
    const subjects = subjectRepositoryMock();
    const topics = topicRepositoryMock();
    const quizzes = quizRepositoryMock();
    vi.mocked(subjects.findById).mockResolvedValue(null);

    const useCase = new GenerateQuizUseCase(subjects, topics, quizzes);

    await expect(useCase.execute({ subjectId: "missing" })).rejects.toThrow(
      'Materia con id "missing" no encontrada.'
    );
    expect(quizzes.createQuiz).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the topic does not exist", async () => {
    const subjects = subjectRepositoryMock();
    const topics = topicRepositoryMock();
    const quizzes = quizRepositoryMock();
    vi.mocked(subjects.findById).mockResolvedValue(baseSubject());
    vi.mocked(topics.findById).mockResolvedValue(null);

    const useCase = new GenerateQuizUseCase(subjects, topics, quizzes);

    await expect(useCase.execute({ subjectId: "subject-1", topicId: "missing" })).rejects.toThrow(
      'Tema con id "missing" no encontrado.'
    );
  });

  it("throws BadRequestException when the topic belongs to another subject", async () => {
    const subjects = subjectRepositoryMock();
    const topics = topicRepositoryMock();
    const quizzes = quizRepositoryMock();
    vi.mocked(subjects.findById).mockResolvedValue(baseSubject());
    vi.mocked(topics.findById).mockResolvedValue(baseTopic({ subjectId: "subject-9" }));

    const useCase = new GenerateQuizUseCase(subjects, topics, quizzes);

    await expect(
      useCase.execute({ subjectId: "subject-1", topicId: "topic-1" })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws BadRequestException when the subject has no topics", async () => {
    const subjects = subjectRepositoryMock();
    const topics = topicRepositoryMock();
    const quizzes = quizRepositoryMock();
    vi.mocked(subjects.findById).mockResolvedValue(baseSubject());
    vi.mocked(topics.findAll).mockResolvedValue([]);

    const useCase = new GenerateQuizUseCase(subjects, topics, quizzes);

    await expect(useCase.execute({ subjectId: "subject-1" })).rejects.toThrow(
      "no tiene temas"
    );
  });

  it("throws BadRequestException when there are no questions available", async () => {
    const subjects = subjectRepositoryMock();
    const topics = topicRepositoryMock();
    const quizzes = quizRepositoryMock();
    vi.mocked(subjects.findById).mockResolvedValue(baseSubject());
    vi.mocked(topics.findById).mockResolvedValue(baseTopic());
    vi.mocked(quizzes.findQuestionIdsByTopics).mockResolvedValue([]);

    const useCase = new GenerateQuizUseCase(subjects, topics, quizzes);

    await expect(
      useCase.execute({ subjectId: "subject-1", topicId: "topic-1" })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(quizzes.createQuiz).not.toHaveBeenCalled();
  });

  it("respects QUIZ_QUESTIONS_COUNT env for the number of selected questions", async () => {
    process.env.QUIZ_QUESTIONS_COUNT = "2";
    const subjects = subjectRepositoryMock();
    const topics = topicRepositoryMock();
    const quizzes = quizRepositoryMock();
    vi.mocked(subjects.findById).mockResolvedValue(baseSubject());
    vi.mocked(topics.findById).mockResolvedValue(baseTopic());
    vi.mocked(quizzes.findQuestionIdsByTopics).mockResolvedValue(["q1", "q2", "q3"]);
    vi.mocked(quizzes.createQuiz).mockResolvedValue(baseQuiz());

    const useCase = new GenerateQuizUseCase(subjects, topics, quizzes);
    await useCase.execute({ subjectId: "subject-1", topicId: "topic-1" });

    const questionIds = vi.mocked(quizzes.createQuiz).mock.calls[0]![0].questionIds;
    expect(questionIds).toHaveLength(2);
    expect(new Set(questionIds).size).toBe(2);
    expect(questionIds.every((id) => ["q1", "q2", "q3"].includes(id))).toBe(true);
  });

  it("uses at most the available questions when there are fewer than the configured count", async () => {
    process.env.QUIZ_QUESTIONS_COUNT = "2";
    const subjects = subjectRepositoryMock();
    const topics = topicRepositoryMock();
    const quizzes = quizRepositoryMock();
    vi.mocked(subjects.findById).mockResolvedValue(baseSubject());
    vi.mocked(topics.findById).mockResolvedValue(baseTopic());
    vi.mocked(quizzes.findQuestionIdsByTopics).mockResolvedValue(["q1"]);
    vi.mocked(quizzes.createQuiz).mockResolvedValue(baseQuiz());

    const useCase = new GenerateQuizUseCase(subjects, topics, quizzes);
    await useCase.execute({ subjectId: "subject-1", topicId: "topic-1" });

    const questionIds = vi.mocked(quizzes.createQuiz).mock.calls[0]![0].questionIds;
    expect(questionIds).toEqual(["q1"]);
  });
});