import { describe, expect, it, vi } from "vitest";

import { QuizAttemptDetailRecord, QuizRepository } from "../ports/quiz.repository";
import { GetQuizAttemptUseCase } from "./get-quiz-attempt.use-case";

function quizRepositoryMock(): QuizRepository {
  return {
    findQuestionIdsByTopics: vi.fn(),
    createQuiz: vi.fn(),
    findQuizForGrading: vi.fn(),
    findQuizForPresentation: vi.fn(),
    saveAttempt: vi.fn(),
    listBySubject: vi.fn(),
    findAttemptDetail: vi.fn()
  };
}

function baseDetail(overrides: Partial<QuizAttemptDetailRecord> = {}): QuizAttemptDetailRecord {
  return {
    attemptId: "attempt-1",
    quizId: "quiz-1",
    quizTitle: "Quiz de Biología",
    score: 50,
    completedAt: new Date("2026-09-11T12:05:00.000Z"),
    answers: [
      {
        questionId: "question-1",
        statement: "¿Qué convierte la luz en energía química?",
        imageId: null,
        sourceMaterialId: null,
        evaluationImageId: null,
        sourceEvaluationId: null,
        options: [
          { id: "option-1", text: "La fotosíntesis", isCorrect: true },
          { id: "option-2", text: "La respiración", isCorrect: false }
        ],
        selectedOptionId: "option-2",
        isCorrect: false,
        explanation: "La clorofila capta la luz."
      }
    ],
    ...overrides
  };
}

describe("GetQuizAttemptUseCase", () => {
  it("returns the detail of an attempt with the correct options marked", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findAttemptDetail).mockResolvedValue(baseDetail());

    const result = await new GetQuizAttemptUseCase(quizzes).execute("quiz-1", "attempt-1");

    expect(quizzes.findAttemptDetail).toHaveBeenCalledWith("quiz-1", "attempt-1");
    expect(result.answers[0]?.options.some((option) => option.isCorrect)).toBe(true);
    expect(result.answers[0]?.selectedOptionId).toBe("option-2");
  });

  it("throws NotFoundException when the attempt does not exist", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findAttemptDetail).mockResolvedValue(null);

    await expect(new GetQuizAttemptUseCase(quizzes).execute("quiz-1", "missing")).rejects.toThrow(
      'Intento con id "missing" no encontrado para el quiz "quiz-1".'
    );
  });

  it("throws NotFoundException when the attempt belongs to another quiz", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findAttemptDetail).mockResolvedValue(null);

    await expect(
      new GetQuizAttemptUseCase(quizzes).execute("quiz-2", "attempt-1")
    ).rejects.toThrow('Intento con id "attempt-1" no encontrado para el quiz "quiz-2".');
  });
});
