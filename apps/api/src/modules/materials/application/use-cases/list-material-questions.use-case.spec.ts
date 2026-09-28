import { describe, expect, it, vi } from "vitest";

import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import {
  MaterialQuestionRecord,
  MaterialQuestionRepository
} from "../ports/material-question.repository";
import { ListMaterialQuestionsUseCase } from "./list-material-questions.use-case";

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

function question(): MaterialQuestionRecord {
  return {
    id: "q-1",
    sourceMaterialId: "material-1",
    statement: "¿Qué es la fotosíntesis?",
    explanation: "Proceso de las plantas.",
    difficulty: "medium",
    imageId: null,
    options: [
      { id: "o-1", text: "Un proceso", isCorrect: true },
      { id: "o-2", text: "Un animal", isCorrect: false }
    ]
  };
}

describe("ListMaterialQuestionsUseCase", () => {
  it("lists questions of an existing material", async () => {
    const materials = materialRepositoryMock();
    const questions = questionRepositoryMock();
    vi.mocked(materials.findById).mockResolvedValue(baseMaterial());
    vi.mocked(questions.listByMaterial).mockResolvedValue([question()]);

    const result = await new ListMaterialQuestionsUseCase(materials, questions).execute(
      "material-1"
    );

    expect(questions.listByMaterial).toHaveBeenCalledWith("material-1");
    expect(result).toHaveLength(1);
    expect(result[0]?.statement).toBe("¿Qué es la fotosíntesis?");
  });

  it("throws NotFoundException when the material does not exist", async () => {
    const materials = materialRepositoryMock();
    const questions = questionRepositoryMock();
    vi.mocked(materials.findById).mockResolvedValue(null);

    await expect(
      new ListMaterialQuestionsUseCase(materials, questions).execute("missing")
    ).rejects.toThrow('Material con id "missing" no encontrado.');
    expect(questions.listByMaterial).not.toHaveBeenCalled();
  });
});
