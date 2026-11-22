import { describe, expect, it, vi } from "vitest";

import { QuizRepository } from "../ports/quiz.repository";
import { GetLastPracticeUseCase } from "./get-last-practice.use-case";

function quizRepositoryMock(): QuizRepository {
  return {
    findQuestionIdsByTopics: vi.fn(),
    createQuiz: vi.fn(),
    findQuizForGrading: vi.fn(),
    findQuizForPresentation: vi.fn(),
    saveAttempt: vi.fn(),
    listBySubject: vi.fn(),
    findAttemptDetail: vi.fn(),
    findLastCompletedAttemptAt: vi.fn()
  };
}

describe("GetLastPracticeUseCase", () => {
  it("returns the completion date of the most recent completed attempt", async () => {
    const quizzes = quizRepositoryMock();
    const completedAt = new Date("2026-11-20T15:00:00.000Z");
    vi.mocked(quizzes.findLastCompletedAttemptAt).mockResolvedValue(completedAt);

    const result = await new GetLastPracticeUseCase(quizzes).execute();

    expect(result).toEqual(completedAt);
  });

  it("returns null when no quiz has been answered yet, not a date", async () => {
    const quizzes = quizRepositoryMock();
    vi.mocked(quizzes.findLastCompletedAttemptAt).mockResolvedValue(null);

    const result = await new GetLastPracticeUseCase(quizzes).execute();

    expect(result).toBeNull();
  });
});
