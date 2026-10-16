import { describe, expect, it, vi } from "vitest";

import {
  SubjectRecord,
  SubjectRepository
} from "../../../subjects/application/ports/subject.repository";
import { QuizListItemRecord, QuizRepository } from "../ports/quiz.repository";
import { ListQuizzesUseCase } from "./list-quizzes.use-case";

function subjectRepositoryMock(): SubjectRepository {
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
    saveAttempt: vi.fn(),
    listBySubject: vi.fn(),
    findAttemptDetail: vi.fn()
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

function quizItem(overrides: Partial<QuizListItemRecord> = {}): QuizListItemRecord {
  return {
    id: "quiz-1",
    title: "Quiz de Biología",
    topicId: null,
    topicName: null,
    questionCount: 5,
    lastAttempt: null,
    createdAt: new Date("2026-09-11T12:00:00.000Z"),
    ...overrides
  };
}

describe("ListQuizzesUseCase", () => {
  it("lists the quizzes of an existing subject", async () => {
    const subjects = subjectRepositoryMock();
    const quizzes = quizRepositoryMock();
    vi.mocked(subjects.findById).mockResolvedValue(baseSubject());
    vi.mocked(quizzes.listBySubject).mockResolvedValue([
      quizItem({
        lastAttempt: {
          id: "attempt-1",
          score: 80,
          completedAt: new Date("2026-09-11T12:05:00.000Z")
        }
      })
    ]);

    const result = await new ListQuizzesUseCase(subjects, quizzes).execute("subject-1");

    expect(quizzes.listBySubject).toHaveBeenCalledWith("subject-1");
    expect(result[0]?.lastAttempt?.score).toBe(80);
  });

  it("keeps a quiz without attempts as a null last attempt, not a zero score", async () => {
    const subjects = subjectRepositoryMock();
    const quizzes = quizRepositoryMock();
    vi.mocked(subjects.findById).mockResolvedValue(baseSubject());
    vi.mocked(quizzes.listBySubject).mockResolvedValue([quizItem()]);

    const result = await new ListQuizzesUseCase(subjects, quizzes).execute("subject-1");

    expect(result[0]?.lastAttempt).toBeNull();
  });

  it("throws NotFoundException when the subject does not exist", async () => {
    const subjects = subjectRepositoryMock();
    const quizzes = quizRepositoryMock();
    vi.mocked(subjects.findById).mockResolvedValue(null);

    await expect(new ListQuizzesUseCase(subjects, quizzes).execute("missing")).rejects.toThrow(
      'Materia con id "missing" no encontrada.'
    );
    expect(quizzes.listBySubject).not.toHaveBeenCalled();
  });
});
