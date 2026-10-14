import { describe, expect, it, vi } from "vitest";

import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { EvaluationImageRecord, EvaluationImageRepository } from "../ports/evaluation-image.repository";
import { EvaluationRecord, EvaluationRepository } from "../ports/evaluation.repository";
import { DeleteEvaluationUseCase } from "./delete-evaluation.use-case";

function evaluationRepositoryMock(): EvaluationRepository {
  return {
    create: vi.fn(),
    findByTopicIds: vi.fn(),
    findById: vi.fn(),
    updateProcessingStatus: vi.fn(),
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

function objectStorageMock(): ObjectStorage {
  return {
    upload: vi.fn(),
    delete: vi.fn(),
    getObject: vi.fn(),
    getSignedUrl: vi.fn()
  };
}

function baseEvaluation(): EvaluationRecord {
  return {
    id: "evaluation-1",
    topicId: "topic-1",
    title: "Examen",
    dateTaken: null,
    processingStatus: "COMPLETED",
    processingError: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z")
  };
}

function baseImage(): EvaluationImageRecord {
  return {
    id: "image-1",
    evaluationId: "evaluation-1",
    storageKey: "evaluations/evaluation-1/images/a.jpg",
    label: "Página 1",
    order: 0,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z")
  };
}

describe("DeleteEvaluationUseCase", () => {
  function setup() {
    const repository = evaluationRepositoryMock();
    const images = evaluationImageRepositoryMock();
    const objectStorage = objectStorageMock();
    vi.mocked(repository.findById).mockResolvedValue(baseEvaluation());
    vi.mocked(images.listByEvaluation).mockResolvedValue([baseImage()]);
    vi.mocked(objectStorage.delete).mockResolvedValue(undefined);
    const useCase = new DeleteEvaluationUseCase(repository, images, objectStorage);
    return { repository, images, objectStorage, useCase };
  }

  it("deletes the record and its photos from the storage", async () => {
    const { useCase, repository, objectStorage } = setup();

    await useCase.execute("evaluation-1");

    expect(repository.delete).toHaveBeenCalledWith("evaluation-1");
    expect(objectStorage.delete).toHaveBeenCalledWith("evaluations/evaluation-1/images/a.jpg");
  });

  it("throws NotFoundException when the evaluation does not exist", async () => {
    const { useCase, repository, objectStorage } = setup();
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(useCase.execute("missing")).rejects.toThrow(
      'Evaluación con id "missing" no encontrada.'
    );
    expect(objectStorage.delete).not.toHaveBeenCalled();
  });
});