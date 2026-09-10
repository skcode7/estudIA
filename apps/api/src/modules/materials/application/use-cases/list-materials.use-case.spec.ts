import { describe, expect, it, vi } from "vitest";

import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import { ListMaterialsUseCase } from "./list-materials.use-case";

function materialRepositoryMock(): MaterialRepository {
  return {
    create: vi.fn(),
    findByTopic: vi.fn(),
    findById: vi.fn(),
    delete: vi.fn()
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
    processingStatus: "PENDING",
    processingError: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

describe("ListMaterialsUseCase", () => {
  it("returns all materials of a topic", async () => {
    const repository = materialRepositoryMock();
    const materials = [baseMaterial("uuid-1"), baseMaterial("uuid-2")];
    vi.mocked(repository.findByTopic).mockResolvedValue(materials);

    const useCase = new ListMaterialsUseCase(repository);
    const result = await useCase.execute("topic-1");

    expect(repository.findByTopic).toHaveBeenCalledWith("topic-1");
    expect(result).toEqual(materials);
  });
});