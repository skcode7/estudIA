import { describe, expect, it, vi } from "vitest";

import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import { MaterialQuestionRepository } from "../ports/material-question.repository";
import { ListMaterialsUseCase } from "./list-materials.use-case";

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

function baseMaterial(id: string, overrides: Partial<MaterialRecord> = {}): MaterialRecord {
  return {
    id,
    topicId: "topic-1",
    type: "TEXT",
    title: "Apunte",
    content: "Contenido",
    storageKey: null,
    hasEmbeddedFigures: false,
    processingStatus: "PENDING",
    processingError: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

describe("ListMaterialsUseCase", () => {
  it("returns all materials of a topic with their question counts", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    const materials = [baseMaterial("uuid-1"), baseMaterial("uuid-2")];
    vi.mocked(repository.findByTopic).mockResolvedValue(materials);
    vi.mocked(questionRepository.countByMaterials).mockResolvedValue(
      new Map([["uuid-1", 3]])
    );

    const useCase = new ListMaterialsUseCase(repository, questionRepository);
    const result = await useCase.execute("topic-1");

    expect(repository.findByTopic).toHaveBeenCalledWith("topic-1");
    expect(questionRepository.countByMaterials).toHaveBeenCalledWith(["uuid-1", "uuid-2"]);
    expect(result).toEqual([
      { material: materials[0], questionCount: 3 },
      { material: materials[1], questionCount: 0 }
    ]);
  });
});
