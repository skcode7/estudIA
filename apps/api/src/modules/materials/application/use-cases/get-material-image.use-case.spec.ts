import { describe, expect, it, vi } from "vitest";

import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import {
  MaterialImageRecord,
  MaterialImageRepository
} from "../ports/material-image.repository";
import { GetMaterialImageUseCase } from "./get-material-image.use-case";

function imageRepositoryMock(): MaterialImageRepository {
  return {
    listByMaterial: vi.fn(),
    replaceForMaterial: vi.fn(),
    findById: vi.fn()
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

function baseImage(overrides: Partial<MaterialImageRecord> = {}): MaterialImageRecord {
  return {
    id: "img-1",
    materialId: "material-1",
    storageKey: "topics/topic-1/materials/material-1/images/a.webp",
    label: "bandera de Francia",
    order: 0,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

describe("GetMaterialImageUseCase", () => {
  it("returns the stored image body with its mime type", async () => {
    const imageRepository = imageRepositoryMock();
    const storage = objectStorageMock();
    vi.mocked(imageRepository.findById).mockResolvedValue(baseImage());
    vi.mocked(storage.getObject).mockResolvedValue(Buffer.from("webp-bytes"));

    const useCase = new GetMaterialImageUseCase(imageRepository, storage);
    const result = await useCase.execute("material-1", "img-1");

    expect(storage.getObject).toHaveBeenCalledWith(
      "topics/topic-1/materials/material-1/images/a.webp"
    );
    expect(result.mimeType).toBe("image/webp");
    expect(result.body).toEqual(Buffer.from("webp-bytes"));
  });

  it("throws NotFoundException when the image does not exist", async () => {
    const imageRepository = imageRepositoryMock();
    const storage = objectStorageMock();
    vi.mocked(imageRepository.findById).mockResolvedValue(null);

    const useCase = new GetMaterialImageUseCase(imageRepository, storage);

    await expect(useCase.execute("material-1", "missing")).rejects.toThrow(
      'Imagen con id "missing" no encontrada para el material "material-1".'
    );
    expect(storage.getObject).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the image belongs to another material", async () => {
    const imageRepository = imageRepositoryMock();
    const storage = objectStorageMock();
    vi.mocked(imageRepository.findById).mockResolvedValue(
      baseImage({ materialId: "other-material" })
    );

    const useCase = new GetMaterialImageUseCase(imageRepository, storage);

    await expect(useCase.execute("material-1", "img-1")).rejects.toThrow(
      'Imagen con id "img-1" no encontrada para el material "material-1".'
    );
    expect(storage.getObject).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the object cannot be read from storage", async () => {
    const imageRepository = imageRepositoryMock();
    const storage = objectStorageMock();
    vi.mocked(imageRepository.findById).mockResolvedValue(baseImage());
    vi.mocked(storage.getObject).mockRejectedValue(new Error("bucket down"));

    const useCase = new GetMaterialImageUseCase(imageRepository, storage);

    await expect(useCase.execute("material-1", "img-1")).rejects.toThrow(
      "No se pudo leer la imagen del almacenamiento."
    );
  });
});
