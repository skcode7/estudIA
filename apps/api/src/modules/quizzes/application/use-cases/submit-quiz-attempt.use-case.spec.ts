import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { QuizGradingRecord, QuizRepository } from "../ports/quiz.repository";
import { SubmitQuizAttemptUseCase } from "./submit-quiz-attempt.use-case";

function quizRepositoryMock(): QuizRepository {
  return {
    findQuestionIdsByTopics: vi.fn(),
    createQuiz: vi.fn(),
    findQuizForGrading: vi.fn(),
    saveAttempt: vi.fn()
  };
}

function baseGradingQuiz(overrides: Partial<QuizGradingRecord> = {}): QuizGradingRecord {
  return {
    id: "quiz-1",
    subjectId: "subject-1",
    topicId: "topic-1",
    questions: [
      {
        id: "question-1",
        topicId: "topic-1",
        statement: "¿Qué convierte la luz en energía química?",
        explanation: "La clorofila capta la luz.",
        options: [
          { id: "option-1", text: "La fotosíntesis", isCorrect: true },
          { id: "option-2", text: "La respiración", isCorrect: false }
        ]
      },
      {
        id: "question-2",
        topicId: "topic-1",
        statement: "¿Qué gas libera la fotosíntesis?",
        explanation: "Libera oxígeno.",
        options: [
          { id: "option-3", text: "CO₂", isCorrect: false },
          { id: "option-4", text: "O₂", isCorrect: true }
        ]
      }
    ],
    ...overrides
  };
}

describe("SubmitQuizAttemptUseCase", () => {
  it("grades answers, computes the score and returns feedback per question", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findQuizForGrading).mockResolvedValue(baseGradingQuiz());
    vi.mocked(quizzes.saveAttempt).mockResolvedValue({
      id: "attempt-1",
      quizId: "quiz-1",
      startedAt: new Date("2026-09-11T12:00:00.000Z"),
      completedAt: new Date("2026-09-11T12:03:00.000Z"),
      score: 50
    });

    const useCase = new SubmitQuizAttemptUseCase(quizzes);
    const result = await useCase.execute({
      quizId: "quiz-1",
      startedAt: new Date("2026-09-11T12:00:00.000Z"),
      answers: [
        { questionId: "question-1", selectedOptionId: "option-1" },
        { questionId: "question-2", selectedOptionId: "option-3" }
      ]
    });

    expect(result.attempt.score).toBe(50);
    expect(quizzes.saveAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        quizId: "quiz-1",
        score: 50,
        startedAt: new Date("2026-09-11T12:00:00.000Z"),
        answers: [
          { questionId: "question-1", selectedOptionId: "option-1", isCorrect: true },
          { questionId: "question-2", selectedOptionId: "option-3", isCorrect: false }
        ]
      })
    );
    expect(result.answers).toEqual([
      expect.objectContaining({
        questionId: "question-1",
        selectedOptionId: "option-1",
        correctOptionId: "option-1",
        isCorrect: true,
        explanation: "La clorofila capta la luz."
      }),
      expect.objectContaining({
        questionId: "question-2",
        selectedOptionId: "option-3",
        correctOptionId: "option-4",
        isCorrect: false,
        explanation: "Libera oxígeno."
      })
    ]);
  });

  it("computes a perfect score when all answers are correct", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findQuizForGrading).mockResolvedValue(baseGradingQuiz());
    vi.mocked(quizzes.saveAttempt).mockResolvedValue({
      id: "attempt-1",
      quizId: "quiz-1",
      startedAt: new Date("2026-09-11T12:00:00.000Z"),
      completedAt: new Date("2026-09-11T12:03:00.000Z"),
      score: 100
    });

    const useCase = new SubmitQuizAttemptUseCase(quizzes);
    const result = await useCase.execute({
      quizId: "quiz-1",
      startedAt: new Date("2026-09-11T12:00:00.000Z"),
      answers: [
        { questionId: "question-1", selectedOptionId: "option-1" },
        { questionId: "question-2", selectedOptionId: "option-4" }
      ]
    });

    expect(vi.mocked(quizzes.saveAttempt).mock.calls[0]![0].score).toBe(100);
    expect(result.answers.every((answer) => answer.isCorrect)).toBe(true);
  });

  it("throws NotFoundException when the quiz does not exist", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findQuizForGrading).mockResolvedValue(null);

    const useCase = new SubmitQuizAttemptUseCase(quizzes);

    await expect(
      useCase.execute({
        quizId: "missing",
        startedAt: new Date(),
        answers: [{ questionId: "q1", selectedOptionId: "o1" }]
      })
    ).rejects.toThrow('Quiz con id "missing" no encontrado.');
  });

  it("rejects when not all questions are answered", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findQuizForGrading).mockResolvedValue(baseGradingQuiz());

    const useCase = new SubmitQuizAttemptUseCase(quizzes);

    await expect(
      useCase.execute({
        quizId: "quiz-1",
        startedAt: new Date(),
        answers: [{ questionId: "question-1", selectedOptionId: "option-1" }]
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(quizzes.saveAttempt).not.toHaveBeenCalled();
  });

  it("rejects when a question does not belong to the quiz", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findQuizForGrading).mockResolvedValue(baseGradingQuiz());

    const useCase = new SubmitQuizAttemptUseCase(quizzes);

    await expect(
      useCase.execute({
        quizId: "quiz-1",
        startedAt: new Date(),
        answers: [
          { questionId: "question-1", selectedOptionId: "option-1" },
          { questionId: "foreign", selectedOptionId: "option-4" }
        ]
      })
    ).rejects.toThrow('La pregunta "foreign" no pertenece al quiz.');
  });

  it("rejects when the selected option does not belong to the question", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findQuizForGrading).mockResolvedValue(baseGradingQuiz());

    const useCase = new SubmitQuizAttemptUseCase(quizzes);

    await expect(
      useCase.execute({
        quizId: "quiz-1",
        startedAt: new Date(),
        answers: [
          { questionId: "question-1", selectedOptionId: "option-1" },
          { questionId: "question-2", selectedOptionId: "option-999" }
        ]
      })
    ).rejects.toThrow('La opción "option-999" no pertenece a la pregunta "question-2".');
  });

  it("rejects when there are no answers", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findQuizForGrading).mockResolvedValue(baseGradingQuiz());

    const useCase = new SubmitQuizAttemptUseCase(quizzes);

    await expect(
      useCase.execute({ quizId: "quiz-1", startedAt: new Date(), answers: [] })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects when the same question is answered twice", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findQuizForGrading).mockResolvedValue(baseGradingQuiz());

    const useCase = new SubmitQuizAttemptUseCase(quizzes);

    await expect(
      useCase.execute({
        quizId: "quiz-1",
        startedAt: new Date(),
        answers: [
          { questionId: "question-1", selectedOptionId: "option-1" },
          { questionId: "question-2", selectedOptionId: "option-3" },
          { questionId: "question-1", selectedOptionId: "option-2" }
        ]
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});