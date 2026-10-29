import { describe, expect, it, vi } from "vitest";

import { MaterialImageRepository } from "../ports/material-image.repository";
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
    replaceForMaterial: vi.fn(),
    listByMaterial: vi.fn(),
    findByIdForMaterial: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
}

function imageRepositoryMock(): MaterialImageRepository {
  return {
    listByMaterial: vi.fn(),
    replaceForMaterial: vi.fn(),
    findById: vi.fn(),
    countByMaterials: vi.fn()
  };
}

describe("GetMaterialUseCase", () => {
  it("returns the material with its question and image counts when found", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    const imageRepository = imageRepositoryMock();
    const material: MaterialRecord = {
      id: "uuid-1",
      topicId: "topic-1",
      type: "TEXT",
      title: "Apunte",
      content: "Contenido",
      storageKey: null,
      hasEmbeddedFigures: false,
      questionMode: "BASED_ON_MATERIAL",
      processingStatus: "PENDING",
      processingError: null,
      createdAt: new Date("2026-09-10T00:00:00.000Z"),
      updatedAt: new Date("2026-09-10T00:00:00.000Z")
    };
    vi.mocked(repository.findById).mockResolvedValue(material);
    vi.mocked(questionRepository.countByMaterials).mockResolvedValue(
      new Map([["uuid-1", 5]])
    );
    vi.mocked(imageRepository.countByMaterials).mockResolvedValue(
      new Map([["uuid-1", 1]])
    );

    const useCase = new GetMaterialUseCase(repository, questionRepository, imageRepository);
    const result = await useCase.execute("uuid-1");

    expect(repository.findById).toHaveBeenCalledWith("uuid-1");
    expect(result).toEqual({ material, questionCount: 5, imageCount: 1 });
  });

  it("throws NotFoundException when material does not exist", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    const imageRepository = imageRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new GetMaterialUseCase(repository, questionRepository, imageRepository);

    await expect(useCase.execute("non-existent")).rejects.toThrow(
      'Material con id "non-existent" no encontrado.'
    );
  });
});
