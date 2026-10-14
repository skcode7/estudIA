import { describe, expect, it, vi } from "vitest";

import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import { EvaluationImageRecord, EvaluationImageRepository } from "../ports/evaluation-image.repository";
import { EvaluationQuestionRepository } from "../ports/evaluation-question.repository";
import { EvaluationRecord, EvaluationRepository } from "../ports/evaluation.repository";
import { ListEvaluationsUseCase } from "./list-evaluations.use-case";

function evaluationRepositoryMock(): EvaluationRepository {
  return {
    create: vi.fn(),
    findByTopicIds: vi.fn(),
    findById: vi.fn(),
    updateProcessingStatus: vi.fn(),
    delete: vi.fn()
  };
}

function evaluationQuestionRepositoryMock(): EvaluationQuestionRepository {
  return {
    countByEvaluations: vi.fn(),
    replaceForEvaluation: vi.fn(),
    listByEvaluation: vi.fn(),
    findByIdForEvaluation: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
}

function evaluationImageRepositoryMock(): EvaluationImageRepository {
  return {
    listByEvaluation: vi.fn(),
    createMany: vi.fn(),
    findById: vi.fn()
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

function baseEvaluation(id: string): EvaluationRecord {
  return {
    id,
    topicId: "topic-1",
    title: `Evaluación ${id}`,
    dateTaken: null,
    processingStatus: "COMPLETED",
    processingError: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z")
  };
}

function baseImage(evaluationId: string): EvaluationImageRecord {
  return {
    id: `${evaluationId}-image`,
    evaluationId,
    storageKey: `evaluations/${evaluationId}/images/a.jpg`,
    label: "Página 1",
    order: 0,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z")
  };
}

function setup() {
  const repository = evaluationRepositoryMock();
  const questionRepository = evaluationQuestionRepositoryMock();
  const imageRepository = evaluationImageRepositoryMock();
  const topics = topicRepositoryMock();
  vi.mocked(questionRepository.countByEvaluations).mockResolvedValue(new Map());
  vi.mocked(imageRepository.listByEvaluation).mockResolvedValue([]);

  const useCase = new ListEvaluationsUseCase(repository, questionRepository, imageRepository, topics);
  return { repository, questionRepository, imageRepository, topics, useCase };
}

describe("ListEvaluationsUseCase", () => {
  it("returns the evaluations of the subject with their question and photo counts", async () => {
    const { useCase, repository, questionRepository, imageRepository, topics } = setup();
    vi.mocked(topics.findAll).mockResolvedValue([
      { id: "topic-1", subjectId: "subject-1", name: "Números", description: null, createdAt: new Date(), updatedAt: new Date() }
    ]);
    vi.mocked(repository.findByTopicIds).mockResolvedValue([baseEvaluation("evaluation-1"), baseEvaluation("evaluation-2")]);
    vi.mocked(questionRepository.countByEvaluations).mockResolvedValue(
      new Map([
        ["evaluation-1", 8],
        ["evaluation-2", 0]
      ])
    );
    vi.mocked(imageRepository.listByEvaluation).mockImplementation(async (evaluationId: string) => [
      baseImage(evaluationId),
      { ...baseImage(evaluationId), id: `${evaluationId}-image-2`, order: 1 }
    ]);

    const result = await useCase.execute("subject-1");

    expect(topics.findAll).toHaveBeenCalledWith({ subjectId: "subject-1" });
    expect(repository.findByTopicIds).toHaveBeenCalledWith(["topic-1"]);
    expect(result).toHaveLength(2);
    expect(result[0]?.questionCount).toBe(8);
    expect(result[0]?.imageCount).toBe(2);
    expect(result[1]?.questionCount).toBe(0);
  });

  it("returns an empty list when the subject has no topics", async () => {
    const { useCase, repository, questionRepository, topics } = setup();
    vi.mocked(topics.findAll).mockResolvedValue([]);

    const result = await useCase.execute("subject-1");

    expect(result).toEqual([]);
    expect(repository.findByTopicIds).not.toHaveBeenCalled();
    expect(questionRepository.countByEvaluations).not.toHaveBeenCalled();
  });

  it("rejects a missing subject id", async () => {
    const { useCase } = setup();

    await expect(useCase.execute("  ")).rejects.toThrow(
      'El parámetro "subjectId" es obligatorio.'
    );
  });
});