import { describe, expect, it, vi } from "vitest";

import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import { CreateFileMaterialUseCase } from "./create-file-material.use-case";

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

function objectStorageMock(): ObjectStorage {
  return {
    upload: vi.fn(),
    delete: vi.fn(),
    getObject: vi.fn(),
    getSignedUrl: vi.fn()
  };
}

function baseMaterial(overrides: Partial<MaterialRecord> = {}): MaterialRecord {
  return {
    id: "uuid-1",
    topicId: "topic-1",
    type: "FILE",
    title: "Foto apunte 1.jpg",
    content: null,
    storageKey: "topics/topic-1/materials/abc.jpg",
    hasEmbeddedFigures: false,
    processingStatus: "PENDING",
    processingError: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

describe("CreateFileMaterialUseCase", () => {
  const baseInput = {
    topicId: "topic-1",
    title: "Foto apunte 1.jpg",
    originalName: "foto.jpg",
    contentType: "image/jpeg",
    body: Buffer.from("fake-image-bytes")
  };

  it("uploads the file and creates a FILE material", async () => {
    const repository = materialRepositoryMock();
    const topicRepository = topicRepositoryMock();
    const storage = objectStorageMock();
    const created = baseMaterial();
    vi.mocked(topicRepository.findById).mockResolvedValue({
      id: "topic-1",
      subjectId: "subject-1",
      name: "Álgebra",
      description: null,
      createdAt: new Date("2026-09-10T00:00:00.000Z"),
      updatedAt: new Date("2026-09-10T00:00:00.000Z")
    });
    vi.mocked(storage.upload).mockResolvedValue({ key: "topics/topic-1/materials/abc.jpg", contentType: "image/jpeg" });
    vi.mocked(repository.create).mockResolvedValue(created);

    const useCase = new CreateFileMaterialUseCase(repository, topicRepository, storage);
    const result = await useCase.execute(baseInput);

    expect(storage.upload).toHaveBeenCalledWith({
      key: expect.stringMatching(/^topics\/topic-1\/materials\/.+\.jpg$/),
      body: baseInput.body,
      contentType: "image/jpeg"
    });
    expect(repository.create).toHaveBeenCalledWith({
      topicId: "topic-1",
      type: "FILE",
      title: "Foto apunte 1.jpg",
      content: null,
      storageKey: "topics/topic-1/materials/abc.jpg",
      hasEmbeddedFigures: false
    });
    expect(result).toEqual(created);
  });

  it("persists the hasEmbeddedFigures flag from the draft analysis", async () => {
    const repository = materialRepositoryMock();
    const topicRepository = topicRepositoryMock();
    const storage = objectStorageMock();
    vi.mocked(topicRepository.findById).mockResolvedValue({
      id: "topic-1",
      subjectId: "subject-1",
      name: "Álgebra",
      description: null,
      createdAt: new Date("2026-09-10T00:00:00.000Z"),
      updatedAt: new Date("2026-09-10T00:00:00.000Z")
    });
    vi.mocked(storage.upload).mockResolvedValue({ key: "topics/topic-1/materials/abc.jpg", contentType: "image/jpeg" });
    vi.mocked(repository.create).mockResolvedValue(baseMaterial());

    const useCase = new CreateFileMaterialUseCase(repository, topicRepository, storage);
    await useCase.execute({ ...baseInput, hasEmbeddedFigures: true });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ hasEmbeddedFigures: true })
    );
  });

  it("persists the extracted content when provided", async () => {
    const repository = materialRepositoryMock();
    const topicRepository = topicRepositoryMock();
    const storage = objectStorageMock();
    vi.mocked(topicRepository.findById).mockResolvedValue({
      id: "topic-1",
      subjectId: "subject-1",
      name: "Álgebra",
      description: null,
      createdAt: new Date("2026-09-10T00:00:00.000Z"),
      updatedAt: new Date("2026-09-10T00:00:00.000Z")
    });
    vi.mocked(storage.upload).mockResolvedValue({ key: "topics/topic-1/materials/abc.jpg", contentType: "image/jpeg" });
    vi.mocked(repository.create).mockResolvedValue(baseMaterial());

    const useCase = new CreateFileMaterialUseCase(repository, topicRepository, storage);
    await useCase.execute({ ...baseInput, content: "Texto extraído de la foto." });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Texto extraído de la foto." })
    );
  });

  it("throws NotFoundException when topic does not exist and does not upload", async () => {
    const repository = materialRepositoryMock();
    const topicRepository = topicRepositoryMock();
    const storage = objectStorageMock();
    vi.mocked(topicRepository.findById).mockResolvedValue(null);

    const useCase = new CreateFileMaterialUseCase(repository, topicRepository, storage);

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      'Tema con id "topic-1" no encontrado.'
    );
    expect(storage.upload).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("throws ServiceUnavailableException when the storage upload fails", async () => {
    const repository = materialRepositoryMock();
    const topicRepository = topicRepositoryMock();
    const storage = objectStorageMock();
    vi.mocked(topicRepository.findById).mockResolvedValue({
      id: "topic-1",
      subjectId: "subject-1",
      name: "Álgebra",
      description: null,
      createdAt: new Date("2026-09-10T00:00:00.000Z"),
      updatedAt: new Date("2026-09-10T00:00:00.000Z")
    });
    vi.mocked(storage.upload).mockRejectedValue(new Error("connection refused"));

    const useCase = new CreateFileMaterialUseCase(repository, topicRepository, storage);

    await expect(useCase.execute(baseInput)).rejects.toThrow(
      "No se pudo almacenar el archivo. Intenta de nuevo."
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});