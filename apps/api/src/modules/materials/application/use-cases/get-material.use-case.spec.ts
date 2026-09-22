import { describe, expect, it, vi } from "vitest";

import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import { MaterialQuestionRepository } from "../ports/material-question.repository";
import { GetMaterialUseCase } from "./get-material.use-case";

function materialRepositoryMock(): MaterialRepository {
  return {
    create: vi.fn(),
    findByTopic: vi.fn(),
    findById: vi.fn(),
    updateProcessingStatus: vi.fn(),
    updateFields: vi.fn(),
    delete: vi.fn()
  };
}

function questionRepositoryMock(): MaterialQuestionRepository {
  return {
    countByMaterials: vi.fn(),
    replaceForMaterial: vi.fn()
  };
}

describe("GetMaterialUseCase", () => {
  it("returns the material with its question count when found", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    const material: MaterialRecord = {
      id: "uuid-1",
      topicId: "topic-1",
      type: "TEXT",
      title: "Apunte",
      content: "Contenido",
      storageKey: null,
      processingStatus: "PENDING",
      processingError: null,
      createdAt: new Date("2026-09-10T00:00:00.000Z"),
      updatedAt: new Date("2026-09-10T00:00:00.000Z")
    };
    vi.mocked(repository.findById).mockResolvedValue(material);
    vi.mocked(questionRepository.countByMaterials).mockResolvedValue(
      new Map([["uuid-1", 5]])
    );

    const useCase = new GetMaterialUseCase(repository, questionRepository);
    const result = await useCase.execute("uuid-1");

    expect(repository.findById).toHaveBeenCalledWith("uuid-1");
    expect(result).toEqual({ material, questionCount: 5 });
  });

  it("throws NotFoundException when material does not exist", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new GetMaterialUseCase(repository, questionRepository);

    await expect(useCase.execute("non-existent")).rejects.toThrow(
      'Material con id "non-existent" no encontrado.'
    );
  });
});
