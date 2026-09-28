import { describe, expect, it, vi } from "vitest";

import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import { MaterialQuestionRepository } from "../ports/material-question.repository";
import { DeleteMaterialQuestionUseCase } from "./delete-material-question.use-case";

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

function baseMaterial(): MaterialRecord {
  return {
    id: "material-1",
    topicId: "topic-1",
    type: "TEXT",
    title: "Apuntes",
    content: "Texto",
    storageKey: null,
    hasEmbeddedFigures: false,
    processingStatus: "COMPLETED",
    processingError: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z")
  };
}

describe("DeleteMaterialQuestionUseCase", () => {
  it("deletes a question that belongs to the material", async () => {
    const materials = materialRepositoryMock();
    const questions = questionRepositoryMock();
    vi.mocked(materials.findById).mockResolvedValue(baseMaterial());
    vi.mocked(questions.delete).mockResolvedValue(true);

    await new DeleteMaterialQuestionUseCase(materials, questions).execute("material-1", "q-1");

    expect(questions.delete).toHaveBeenCalledWith("material-1", "q-1");
  });

  it("throws NotFoundException when the question is missing", async () => {
    const materials = materialRepositoryMock();
    const questions = questionRepositoryMock();
    vi.mocked(materials.findById).mockResolvedValue(baseMaterial());
    vi.mocked(questions.delete).mockResolvedValue(false);

    await expect(
      new DeleteMaterialQuestionUseCase(materials, questions).execute("material-1", "missing")
    ).rejects.toThrow('Pregunta con id "missing" no encontrada para el material "material-1".');
  });
});
