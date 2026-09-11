import { describe, expect, it, vi } from "vitest";

import { MaterialRepository } from "../ports/material.repository";
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

describe("GetMaterialUseCase", () => {
  it("returns the material when found", async () => {
    const repository = materialRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue({
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
    });

    const useCase = new GetMaterialUseCase(repository);
    const result = await useCase.execute("uuid-1");

    expect(repository.findById).toHaveBeenCalledWith("uuid-1");
    expect(result?.id).toBe("uuid-1");
  });

  it("throws NotFoundException when material does not exist", async () => {
    const repository = materialRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new GetMaterialUseCase(repository);

    await expect(useCase.execute("non-existent")).rejects.toThrow(
      'Material con id "non-existent" no encontrado.'
    );
  });
});