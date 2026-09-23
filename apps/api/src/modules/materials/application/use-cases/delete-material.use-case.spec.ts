import { describe, expect, it, vi } from "vitest";

import { MaterialImageRepository } from "../ports/material-image.repository";
import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import { DeleteMaterialUseCase } from "./delete-material.use-case";
import { ObjectStorage } from "../../../storage/application/ports/object-storage";

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

function objectStorageMock(): ObjectStorage {
  return {
    upload: vi.fn(),
    delete: vi.fn(),
    getObject: vi.fn(),
    getSignedUrl: vi.fn()
  };
}

function imageRepositoryMock(): MaterialImageRepository {
  return {
    listByMaterial: vi.fn(async () => []),
    replaceForMaterial: vi.fn(async () => []),
    findById: vi.fn()
  };
}

function baseMaterial(overrides: Partial<MaterialRecord> = {}): MaterialRecord {
  return {
    id: "uuid-1",
    topicId: "topic-1",
    type: "FILE",
    title: "Foto apunte.jpg",
    content: null,
    storageKey: "topics/topic-1/materials/abc.jpg",
    processingStatus: "PENDING",
    processingError: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

describe("DeleteMaterialUseCase", () => {
  it("deletes the material and its stored object", async () => {
    const repository = materialRepositoryMock();
    const storage = objectStorageMock();
    const imageRepository = imageRepositoryMock();
    const material = baseMaterial();
    vi.mocked(repository.findById).mockResolvedValue(material);
    vi.mocked(repository.delete).mockResolvedValue(undefined);
    vi.mocked(storage.delete).mockResolvedValue(undefined);

    const useCase = new DeleteMaterialUseCase(repository, storage, imageRepository);
    await useCase.execute("uuid-1");

    expect(repository.delete).toHaveBeenCalledWith("uuid-1");
    expect(storage.delete).toHaveBeenCalledWith("topics/topic-1/materials/abc.jpg");
  });

  it("also deletes the extracted images from storage", async () => {
    const repository = materialRepositoryMock();
    const storage = objectStorageMock();
    const imageRepository = imageRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(baseMaterial());
    vi.mocked(repository.delete).mockResolvedValue(undefined);
    vi.mocked(storage.delete).mockResolvedValue(undefined);
    vi.mocked(imageRepository.listByMaterial).mockResolvedValue([
      {
        id: "img-1",
        materialId: "uuid-1",
        storageKey: "topics/topic-1/materials/uuid-1/images/a.webp",
        label: "bandera de Francia",
        order: 0,
        createdAt: new Date("2026-09-10T00:00:00.000Z"),
        updatedAt: new Date("2026-09-10T00:00:00.000Z")
      }
    ]);

    const useCase = new DeleteMaterialUseCase(repository, storage, imageRepository);
    await useCase.execute("uuid-1");

    expect(storage.delete).toHaveBeenCalledWith("topics/topic-1/materials/abc.jpg");
    expect(storage.delete).toHaveBeenCalledWith("topics/topic-1/materials/uuid-1/images/a.webp");
  });

  it("does not touch storage for text materials", async () => {
    const repository = materialRepositoryMock();
    const storage = objectStorageMock();
    const imageRepository = imageRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(baseMaterial({ storageKey: null }));
    vi.mocked(repository.delete).mockResolvedValue(undefined);

    const useCase = new DeleteMaterialUseCase(repository, storage, imageRepository);
    await useCase.execute("uuid-1");

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when material does not exist", async () => {
    const repository = materialRepositoryMock();
    const storage = objectStorageMock();
    const imageRepository = imageRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new DeleteMaterialUseCase(repository, storage, imageRepository);

    await expect(useCase.execute("non-existent")).rejects.toThrow(
      'Material con id "non-existent" no encontrado.'
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
