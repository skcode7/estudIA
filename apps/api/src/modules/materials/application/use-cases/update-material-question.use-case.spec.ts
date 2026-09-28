import { describe, expect, it, vi } from "vitest";

import { MaterialImageRepository } from "../ports/material-image.repository";
import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import {
  MaterialQuestionRecord,
  MaterialQuestionRepository
} from "../ports/material-question.repository";
import { UpdateMaterialQuestionUseCase } from "./update-material-question.use-case";

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
    findById: vi.fn()
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

function validFields() {
  return {
    statement: "¿Cuál es la capital?",
    explanation: "París es la capital.",
    difficulty: "medium",
    imageId: null as string | null,
    options: [
      { text: "París", isCorrect: true },
      { text: "Lyon", isCorrect: false }
    ]
  };
}

function updatedQuestion(): MaterialQuestionRecord {
  return {
    id: "q-1",
    sourceMaterialId: "material-1",
    statement: "¿Cuál es la capital?",
    explanation: "París es la capital.",
    difficulty: "medium",
    imageId: null,
    options: [
      { id: "o-1", text: "París", isCorrect: true },
      { id: "o-2", text: "Lyon", isCorrect: false }
    ]
  };
}

describe("UpdateMaterialQuestionUseCase", () => {
  it("updates a question that belongs to the material", async () => {
    const materials = materialRepositoryMock();
    const questions = questionRepositoryMock();
    const images = imageRepositoryMock();
    vi.mocked(materials.findById).mockResolvedValue(baseMaterial());
    vi.mocked(questions.update).mockResolvedValue(updatedQuestion());

    const result = await new UpdateMaterialQuestionUseCase(materials, questions, images).execute(
      "material-1",
      "q-1",
      validFields()
    );

    expect(questions.update).toHaveBeenCalledWith("material-1", "q-1", {
      statement: "¿Cuál es la capital?",
      explanation: "París es la capital.",
      difficulty: "medium",
      imageId: null,
      options: [
        { text: "París", isCorrect: true },
        { text: "Lyon", isCorrect: false }
      ]
    });
    expect(result.statement).toBe("¿Cuál es la capital?");
  });

  it("rejects a question without exactly one correct option", async () => {
    const materials = materialRepositoryMock();
    const questions = questionRepositoryMock();
    const images = imageRepositoryMock();
    vi.mocked(materials.findById).mockResolvedValue(baseMaterial());

    await expect(
      new UpdateMaterialQuestionUseCase(materials, questions, images).execute("material-1", "q-1", {
        ...validFields(),
        options: [
          { text: "París", isCorrect: false },
          { text: "Lyon", isCorrect: false }
        ]
      })
    ).rejects.toThrow("La pregunta debe tener exactamente una opción correcta.");
    expect(questions.update).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the question does not belong to the material", async () => {
    const materials = materialRepositoryMock();
    const questions = questionRepositoryMock();
    const images = imageRepositoryMock();
    vi.mocked(materials.findById).mockResolvedValue(baseMaterial());
    vi.mocked(questions.update).mockResolvedValue(null);

    await expect(
      new UpdateMaterialQuestionUseCase(materials, questions, images).execute(
        "material-1",
        "other",
        validFields()
      )
    ).rejects.toThrow('Pregunta con id "other" no encontrada para el material "material-1".');
  });
});
