import { describe, expect, it, vi } from "vitest";

import {
  MaterialImageRecord,
  MaterialImageRepository
} from "../ports/material-image.repository";
import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import { ListMaterialImagesUseCase } from "./list-material-images.use-case";

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
    type: "FILE",
    title: "Foto",
    content: null,
    storageKey: "topics/topic-1/materials/foto.jpg",
    hasEmbeddedFigures: true,
    processingStatus: "COMPLETED",
    processingError: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z")
  };
}

function image(): MaterialImageRecord {
  return {
    id: "img-1",
    materialId: "material-1",
    storageKey: "topics/topic-1/materials/material-1/images/a.webp",
    label: "Bandera de Francia",
    order: 0,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z")
  };
}

describe("ListMaterialImagesUseCase", () => {
  it("lists images of an existing material", async () => {
    const materials = materialRepositoryMock();
    const images = imageRepositoryMock();
    vi.mocked(materials.findById).mockResolvedValue(baseMaterial());
    vi.mocked(images.listByMaterial).mockResolvedValue([image()]);

    const result = await new ListMaterialImagesUseCase(materials, images).execute("material-1");

    expect(images.listByMaterial).toHaveBeenCalledWith("material-1");
    expect(result[0]?.label).toBe("Bandera de Francia");
  });

  it("throws NotFoundException when the material does not exist", async () => {
    const materials = materialRepositoryMock();
    const images = imageRepositoryMock();
    vi.mocked(materials.findById).mockResolvedValue(null);

    await expect(
      new ListMaterialImagesUseCase(materials, images).execute("missing")
    ).rejects.toThrow('Material con id "missing" no encontrado.');
    expect(images.listByMaterial).not.toHaveBeenCalled();
  });
});
