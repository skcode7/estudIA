import { describe, expect, it, vi } from "vitest";

import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import { MaterialQuestionRepository } from "../ports/material-question.repository";
import { UpdateMaterialUseCase } from "./update-material.use-case";

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

function baseMaterial(overrides: Partial<MaterialRecord> = {}): MaterialRecord {
  return {
    id: "uuid-1",
    topicId: "topic-1",
    type: "FILE",
    title: "Foto apunte.jpg",
    content: null,
    storageKey: "topics/topic-1/materials/foto.jpg",
    hasEmbeddedFigures: false,
    processingStatus: "COMPLETED",
    processingError: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

describe("UpdateMaterialUseCase", () => {
  it("updates title and content and returns the question count", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    const updated = baseMaterial({ title: "Fotosíntesis", content: "Texto corregido" });
    vi.mocked(repository.findById).mockResolvedValue(baseMaterial());
    vi.mocked(repository.updateFields).mockResolvedValue(updated);
    vi.mocked(questionRepository.countByMaterials).mockResolvedValue(
      new Map([["uuid-1", 2]])
    );

    const useCase = new UpdateMaterialUseCase(repository, questionRepository);
    const result = await useCase.execute("uuid-1", {
      title: "Fotosíntesis",
      content: "Texto corregido"
    });

    expect(repository.updateFields).toHaveBeenCalledWith("uuid-1", {
      title: "Fotosíntesis",
      content: "Texto corregido"
    });
    expect(result).toEqual({ material: updated, questionCount: 2 });
  });

  it("throws NotFoundException when material does not exist", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new UpdateMaterialUseCase(repository, questionRepository);

    await expect(
      useCase.execute("missing", { title: "Nuevo título" })
    ).rejects.toThrow('Material con id "missing" no encontrado.');
    expect(repository.updateFields).not.toHaveBeenCalled();
  });
});
