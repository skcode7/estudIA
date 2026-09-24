import { describe, expect, it, vi } from "vitest";

import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import { CreateTextMaterialUseCase } from "./create-text-material.use-case";

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

function topicRepositoryMock(): TopicRepository {
  return {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
}

function baseMaterial(overrides: Partial<MaterialRecord> = {}): MaterialRecord {
  return {
    id: "uuid-1",
    topicId: "topic-1",
    type: "TEXT",
    title: "Apuntes de álgebra",
    content: "Contenido del apunte",
    storageKey: null,
    hasEmbeddedFigures: false,
    processingStatus: "PENDING",
    processingError: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

function baseTopic() {
  return {
    id: "topic-1",
    subjectId: "subject-1",
    name: "Álgebra",
    description: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z")
  };
}

describe("CreateTextMaterialUseCase", () => {
  it("creates a text material delegating to the repository", async () => {
    const repository = materialRepositoryMock();
    const topicRepository = topicRepositoryMock();
    const created = baseMaterial();
    vi.mocked(topicRepository.findById).mockResolvedValue(baseTopic());
    vi.mocked(repository.create).mockResolvedValue(created);

    const useCase = new CreateTextMaterialUseCase(repository, topicRepository);
    const result = await useCase.execute({
      topicId: "topic-1",
      type: "TEXT",
      title: "Apuntes de álgebra",
      content: "Contenido del apunte"
    });

    expect(topicRepository.findById).toHaveBeenCalledWith("topic-1");
    expect(repository.create).toHaveBeenCalledWith({
      topicId: "topic-1",
      type: "TEXT",
      title: "Apuntes de álgebra",
      content: "Contenido del apunte"
    });
    expect(result).toEqual(created);
  });

  it("throws NotFoundException when topic does not exist", async () => {
    const repository = materialRepositoryMock();
    const topicRepository = topicRepositoryMock();
    vi.mocked(topicRepository.findById).mockResolvedValue(null);

    const useCase = new CreateTextMaterialUseCase(repository, topicRepository);

    await expect(
      useCase.execute({ topicId: "missing", type: "TEXT", title: "Título" })
    ).rejects.toThrow('Tema con id "missing" no encontrado.');
    expect(repository.create).not.toHaveBeenCalled();
  });
});