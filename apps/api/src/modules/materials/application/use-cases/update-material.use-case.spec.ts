import { describe, expect, it, vi } from "vitest";

import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
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

function baseMaterial(overrides: Partial<MaterialRecord> = {}): MaterialRecord {
  return {
    id: "uuid-1",
    topicId: "topic-1",
    type: "FILE",
    title: "Foto apunte.jpg",
    content: null,
    storageKey: "topics/topic-1/materials/foto.jpg",
    processingStatus: "COMPLETED",
    processingError: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

describe("UpdateMaterialUseCase", () => {
  it("updates title and content", async () => {
    const repository = materialRepositoryMock();
    const updated = baseMaterial({ title: "Fotosíntesis", content: "Texto corregido" });
    vi.mocked(repository.findById).mockResolvedValue(baseMaterial());
    vi.mocked(repository.updateFields).mockResolvedValue(updated);

    const useCase = new UpdateMaterialUseCase(repository);
    const result = await useCase.execute("uuid-1", {
      title: "Fotosíntesis",
      content: "Texto corregido"
    });

    expect(repository.updateFields).toHaveBeenCalledWith("uuid-1", {
      title: "Fotosíntesis",
      content: "Texto corregido"
    });
    expect(result).toEqual(updated);
  });

  it("throws NotFoundException when material does not exist", async () => {
    const repository = materialRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new UpdateMaterialUseCase(repository);

    await expect(
      useCase.execute("missing", { title: "Nuevo título" })
    ).rejects.toThrow('Material con id "missing" no encontrado.');
    expect(repository.updateFields).not.toHaveBeenCalled();
  });
});