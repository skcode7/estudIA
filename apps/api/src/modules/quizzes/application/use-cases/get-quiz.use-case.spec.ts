import { describe, expect, it, vi } from "vitest";

import { QuizRecord, QuizRepository } from "../ports/quiz.repository";
import { GetQuizUseCase } from "./get-quiz.use-case";

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

function baseQuiz(overrides: Partial<QuizRecord> = {}): QuizRecord {
  return {
    id: "quiz-1",
    title: "Quiz de Biología",
    subjectId: "subject-1",
    subjectName: "Biología",
    topicId: "topic-1",
    topicName: "Fotosíntesis",
    createdAt: new Date("2026-09-11T12:00:00.000Z"),
    updatedAt: new Date("2026-09-11T12:00:00.000Z"),
    questions: [
      {
        id: "question-1",
        type: "MULTIPLE_CHOICE",
        statement: "¿Qué convierte la luz en energía química?",
        imageId: null,
        sourceMaterialId: null,
        evaluationImageId: null,
        sourceEvaluationId: null,
        options: [
          { id: "option-1", text: "La fotosíntesis" },
          { id: "option-2", text: "La respiración" }
        ]
      }
    ],
    ...overrides
  };
}

describe("GetQuizUseCase", () => {
  it("devuelve el quiz presentable sin corrección", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findQuizForPresentation).mockResolvedValue(baseQuiz());

    const result = await new GetQuizUseCase(quizzes).execute("quiz-1");

    expect(quizzes.findQuizForPresentation).toHaveBeenCalledWith("quiz-1");
    expect(result.id).toBe("quiz-1");
    expect(result.questions[0]?.options.every((option) => !("isCorrect" in option))).toBe(true);
  });

  it("lanza NotFoundException si el quiz no existe", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findQuizForPresentation).mockResolvedValue(null);

    await expect(new GetQuizUseCase(quizzes).execute("quiz-999")).rejects.toThrow("no encontrado");
  });
});
