import { describe, expect, it, vi } from "vitest";

import { AIProvider, MaterialAnalysis } from "../../../ai/application/ports/ai-provider";
import {
  ExtractedImageRegion,
  MaterialImageExtractor
} from "../../../ai/application/ports/image-extractor";
import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { ImageCropper } from "../ports/image-cropper";
import {
  MaterialImageRecord,
  MaterialImageRepository
} from "../ports/material-image.repository";
import { MaterialRecord, MaterialRepository } from "../ports/material.repository";
import { MaterialQuestionRepository } from "../ports/material-question.repository";
import { ProcessMaterialUseCase } from "./process-material.use-case";

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
    replaceForMaterial: vi.fn()
  };
}

function aiProviderMock(): AIProvider {
  return {
    analyzeMaterial: vi.fn(),
    generateQuestions: vi.fn(),
    explainAnswer: vi.fn(),
    generateHint: vi.fn()
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

function imageExtractorMock(): MaterialImageExtractor {
  return {
    isAvailable: vi.fn(() => true),
    extractRegions: vi.fn()
  };
}

function imageCropperMock(): ImageCropper {
  return {
    cropToWebp: vi.fn()
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
    type: "TEXT",
    title: "Apuntes de fotosíntesis",
    content: "La fotosíntesis convierte la luz en energía química.",
    storageKey: null,
    processingStatus: "PENDING",
    processingError: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

function baseAnalysis(overrides: Partial<MaterialAnalysis> = {}): MaterialAnalysis {
  return {
    suggestedTitle: "Fotosíntesis",
    summary: "La fotosíntesis es el proceso de convertir luz en energía química.",
    concepts: ["fotosíntesis", "clorofila"],
    objectives: ["Entender la fotosíntesis"],
    extractedContent: "Texto transcrito por la IA.",
    embeddedFigureCount: 0,
    ...overrides
  };
}

function generatedQuestionPayload() {
  return [
    {
      statement: "¿Qué convierte la fotosíntesis?",
      explanation: "La luz en energía química.",
      difficulty: "medium" as const,
      options: [
        { text: "Luz en energía química", isCorrect: true },
        { text: "Agua en luz", isCorrect: false },
        { text: "Energía en luz", isCorrect: false },
        { text: "Nada", isCorrect: false }
      ]
    }
  ];
}

function extractedRegions(): ExtractedImageRegion[] {
  return [
    { label: "bandera de Francia", box: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 } },
    { label: "mapa de España", box: { x: 0.5, y: 0.5, width: 0.3, height: 0.3 } }
  ];
}

function imageRecords(): MaterialImageRecord[] {
  return [
    {
      id: "img-1",
      materialId: "uuid-1",
      storageKey: "topics/topic-1/materials/uuid-1/images/a.webp",
      label: "bandera de Francia",
      order: 0,
      createdAt: new Date("2026-09-10T00:00:00.000Z"),
      updatedAt: new Date("2026-09-10T00:00:00.000Z")
    },
    {
      id: "img-2",
      materialId: "uuid-1",
      storageKey: "topics/topic-1/materials/uuid-1/images/b.webp",
      label: "mapa de España",
      order: 1,
      createdAt: new Date("2026-09-10T00:00:00.000Z"),
      updatedAt: new Date("2026-09-10T00:00:00.000Z")
    }
  ];
}

function setupProcessingStatus(repository: MaterialRepository) {
  vi.mocked(repository.updateProcessingStatus).mockImplementation(async (id, status, error) =>
    baseMaterial({ id, processingStatus: status, processingError: error ?? null })
  );
}

function buildUseCase(deps: {
  repository: MaterialRepository;
  questionRepository: MaterialQuestionRepository;
  ai: AIProvider;
  storage: ObjectStorage;
  imageExtractor: MaterialImageExtractor;
  imageCropper: ImageCropper;
  imageRepository: MaterialImageRepository;
}): ProcessMaterialUseCase {
  return new ProcessMaterialUseCase(
    deps.repository,
    deps.questionRepository,
    deps.ai,
    deps.storage,
    { questionsCount: 3 },
    deps.imageExtractor,
    deps.imageCropper,
    deps.imageRepository
  );
}

function buildMocks() {
  const repository = materialRepositoryMock();
  const questionRepository = questionRepositoryMock();
  const ai = aiProviderMock();
  const storage = objectStorageMock();
  const imageExtractor = imageExtractorMock();
  const imageCropper = imageCropperMock();
  const imageRepository = imageRepositoryMock();
  setupProcessingStatus(repository);
  return { repository, questionRepository, ai, storage, imageExtractor, imageCropper, imageRepository };
}

describe("ProcessMaterialUseCase", () => {
  it("processes a TEXT material to COMPLETED and replaces questions", async () => {
    const mocks = buildMocks();
    const { repository, questionRepository, ai, storage } = mocks;
    const material = baseMaterial();
    vi.mocked(repository.findById).mockResolvedValue(material);
    vi.mocked(repository.updateFields).mockResolvedValue(
      baseMaterial({ title: "Fotosíntesis", content: "La fotosíntesis convierte la luz en energía química." })
    );
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(baseAnalysis());
    vi.mocked(ai.generateQuestions).mockResolvedValue(generatedQuestionPayload());
    vi.mocked(questionRepository.replaceForMaterial).mockResolvedValue(1);
    vi.mocked(storage.upload).mockResolvedValue({ key: "analysis.json", contentType: "application/json" });

    const useCase = buildUseCase(mocks);
    const result = await useCase.execute("uuid-1");

    expect(result.material.processingStatus).toBe("COMPLETED");
    expect(result.questionCount).toBe(1);
    expect(ai.analyzeMaterial).toHaveBeenCalledWith({
      title: material.title,
      content: material.content,
      image: null
    });
    expect(repository.updateFields).toHaveBeenCalledWith("uuid-1", {
      title: "Fotosíntesis",
      content: "Texto transcrito por la IA."
    });
    expect(ai.generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ count: 3 })
    );
    expect(questionRepository.replaceForMaterial).toHaveBeenCalledWith("uuid-1", [
      expect.objectContaining({
        statement: "¿Qué convierte la fotosíntesis?",
        imageId: null
      })
    ]);
    expect(storage.upload).toHaveBeenCalledWith({
      key: "topics/topic-1/materials/uuid-1/analysis.json",
      body: expect.any(Buffer),
      contentType: "application/json"
    });
    expect(mocks.imageExtractor.extractRegions).not.toHaveBeenCalled();
  });

  it("processes a supported FILE image (JPG) sending the image to the provider", async () => {
    const mocks = buildMocks();
    const { repository, ai } = mocks;
    const material = baseMaterial({
      type: "FILE",
      content: null,
      storageKey: "topics/topic-1/materials/foto.jpg"
    });
    vi.mocked(repository.findById).mockResolvedValue(material);
    vi.mocked(mocks.storage.getObject).mockResolvedValue(Buffer.from("fake-image"));
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(baseAnalysis());
    vi.mocked(ai.generateQuestions).mockResolvedValue(generatedQuestionPayload());
    vi.mocked(mocks.questionRepository.replaceForMaterial).mockResolvedValue(1);

    const useCase = buildUseCase(mocks);
    const result = await useCase.execute("uuid-1");

    expect(mocks.storage.getObject).toHaveBeenCalledWith("topics/topic-1/materials/foto.jpg");
    expect(ai.analyzeMaterial).toHaveBeenCalledWith(
      expect.objectContaining({
        image: { mimeType: "image/jpeg", body: expect.any(Buffer) }
      })
    );
    expect(result.material.processingStatus).toBe("COMPLETED");
    expect(mocks.imageExtractor.extractRegions).not.toHaveBeenCalled();
  });

  it("extracts embedded figures and links image questions to the stored images", async () => {
    const mocks = buildMocks();
    const { repository, questionRepository, ai, storage, imageExtractor, imageCropper, imageRepository } = mocks;
    vi.mocked(repository.findById).mockResolvedValue(
      baseMaterial({ type: "FILE", content: null, storageKey: "topics/topic-1/materials/foto.jpg" })
    );
    vi.mocked(storage.getObject).mockResolvedValue(Buffer.from("fake-image"));
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(baseAnalysis({ embeddedFigureCount: 2 }));
    vi.mocked(imageExtractor.extractRegions).mockResolvedValue(extractedRegions());
    vi.mocked(imageCropper.cropToWebp).mockResolvedValue(Buffer.from("crop"));
    vi.mocked(storage.upload).mockResolvedValue({ key: "k", contentType: "image/webp" });
    vi.mocked(imageRepository.listByMaterial).mockResolvedValue([]);
    vi.mocked(imageRepository.replaceForMaterial).mockResolvedValue(imageRecords());
    vi.mocked(ai.generateQuestions).mockResolvedValue([
      {
        statement: "¿A qué corresponde esta imagen?",
        difficulty: "easy",
        imageIndex: 1,
        options: [
          { text: "Mapa de España", isCorrect: true },
          { text: "Bandera de Francia", isCorrect: false },
          { text: "Mapa de Portugal", isCorrect: false },
          { text: "Escudo de España", isCorrect: false }
        ]
      }
    ]);
    vi.mocked(questionRepository.replaceForMaterial).mockResolvedValue(1);

    const useCase = buildUseCase(mocks);
    const result = await useCase.execute("uuid-1");

    expect(result.material.processingStatus).toBe("COMPLETED");
    expect(imageExtractor.extractRegions).toHaveBeenCalledWith({
      image: { mimeType: "image/jpeg", body: expect.any(Buffer) },
      maxRegions: 5,
      hintCount: 2
    });
    expect(imageCropper.cropToWebp).toHaveBeenCalledTimes(2);
    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining("topics/topic-1/materials/uuid-1/images/"),
        contentType: "image/webp"
      })
    );
    expect(imageRepository.replaceForMaterial).toHaveBeenCalledWith("uuid-1", [
      expect.objectContaining({ label: "bandera de Francia", order: 0 }),
      expect.objectContaining({ label: "mapa de España", order: 1 })
    ]);
    expect(ai.generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [
          { index: 0, label: "bandera de Francia" },
          { index: 1, label: "mapa de España" }
        ]
      })
    );
    expect(questionRepository.replaceForMaterial).toHaveBeenCalledWith("uuid-1", [
      expect.objectContaining({ statement: "¿A qué corresponde esta imagen?", imageId: "img-2" })
    ]);
  });

  it("degrades to text-only questions when the extractor fails", async () => {
    const mocks = buildMocks();
    const { repository, questionRepository, ai, imageExtractor } = mocks;
    vi.mocked(repository.findById).mockResolvedValue(
      baseMaterial({ type: "FILE", content: null, storageKey: "topics/topic-1/materials/foto.jpg" })
    );
    vi.mocked(mocks.storage.getObject).mockResolvedValue(Buffer.from("fake-image"));
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(baseAnalysis({ embeddedFigureCount: 2 }));
    vi.mocked(imageExtractor.extractRegions).mockRejectedValue(new Error("provider down"));
    vi.mocked(ai.generateQuestions).mockResolvedValue(generatedQuestionPayload());
    vi.mocked(questionRepository.replaceForMaterial).mockResolvedValue(1);

    const useCase = buildUseCase(mocks);
    const result = await useCase.execute("uuid-1");

    expect(result.material.processingStatus).toBe("COMPLETED");
    expect(ai.generateQuestions).toHaveBeenCalledWith(
      expect.not.objectContaining({ images: expect.anything() })
    );
    expect(questionRepository.replaceForMaterial).toHaveBeenCalledWith("uuid-1", [
      expect.objectContaining({ imageId: null })
    ]);
  });

  it("skips extraction when the image extractor is not available", async () => {
    const mocks = buildMocks();
    const { repository, ai, imageExtractor } = mocks;
    vi.mocked(imageExtractor.isAvailable).mockReturnValue(false);
    vi.mocked(repository.findById).mockResolvedValue(
      baseMaterial({ type: "FILE", content: null, storageKey: "topics/topic-1/materials/foto.jpg" })
    );
    vi.mocked(mocks.storage.getObject).mockResolvedValue(Buffer.from("fake-image"));
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(baseAnalysis({ embeddedFigureCount: 2 }));
    vi.mocked(ai.generateQuestions).mockResolvedValue(generatedQuestionPayload());
    vi.mocked(mocks.questionRepository.replaceForMaterial).mockResolvedValue(1);

    const useCase = buildUseCase(mocks);
    const result = await useCase.execute("uuid-1");

    expect(result.material.processingStatus).toBe("COMPLETED");
    expect(imageExtractor.extractRegions).not.toHaveBeenCalled();
    expect(ai.generateQuestions).toHaveBeenCalledWith(
      expect.not.objectContaining({ images: expect.anything() })
    );
  });

  it("cleans up stale extracted images when reprocessing produces fewer figures", async () => {
    const mocks = buildMocks();
    const { repository, ai, storage, imageExtractor, imageCropper, imageRepository } = mocks;
    vi.mocked(repository.findById).mockResolvedValue(
      baseMaterial({ type: "FILE", content: null, storageKey: "topics/topic-1/materials/foto.jpg" })
    );
    vi.mocked(storage.getObject).mockResolvedValue(Buffer.from("fake-image"));
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(baseAnalysis({ embeddedFigureCount: 1 }));
    vi.mocked(imageExtractor.extractRegions).mockResolvedValue([extractedRegions()[0]!]);
    vi.mocked(imageCropper.cropToWebp).mockResolvedValue(Buffer.from("crop"));
    vi.mocked(storage.upload).mockResolvedValue({ key: "k", contentType: "image/webp" });
    vi.mocked(imageRepository.listByMaterial).mockResolvedValue(imageRecords());
    vi.mocked(imageRepository.replaceForMaterial).mockResolvedValue([
      { ...imageRecords()[0]!, storageKey: "new-key.webp" }
    ]);
    vi.mocked(ai.generateQuestions).mockResolvedValue(generatedQuestionPayload());
    vi.mocked(mocks.questionRepository.replaceForMaterial).mockResolvedValue(1);

    const useCase = buildUseCase(mocks);
    await useCase.execute("uuid-1");

    expect(storage.delete).toHaveBeenCalledWith("topics/topic-1/materials/uuid-1/images/a.webp");
    expect(storage.delete).toHaveBeenCalledWith("topics/topic-1/materials/uuid-1/images/b.webp");
  });

  it("marks FAILED when the file type is not a supported image", async () => {
    const mocks = buildMocks();
    const { repository, ai, storage } = mocks;
    vi.mocked(repository.findById).mockResolvedValue(
      baseMaterial({ type: "FILE", content: null, storageKey: "topics/topic-1/materials/apunte.pdf" })
    );
    vi.mocked(storage.getObject).mockResolvedValue(Buffer.from("pdf"));

    const useCase = buildUseCase(mocks);
    const result = await useCase.execute("uuid-1");

    expect(storage.getObject).toHaveBeenCalled();
    expect(ai.analyzeMaterial).not.toHaveBeenCalled();
    expect(ai.generateQuestions).not.toHaveBeenCalled();
    expect(result.material.processingStatus).toBe("FAILED");
    expect(result.material.processingError).toContain("solo se procesan imágenes");
    expect(result.questionCount).toBe(0);
  });

  it("marks FAILED when a TEXT material has no content", async () => {
    const mocks = buildMocks();
    const { repository, ai } = mocks;
    vi.mocked(repository.findById).mockResolvedValue(baseMaterial({ content: null }));

    const useCase = buildUseCase(mocks);
    const result = await useCase.execute("uuid-1");

    expect(result.material.processingStatus).toBe("FAILED");
    expect(result.material.processingError).toContain("no tiene contenido");
    expect(ai.analyzeMaterial).not.toHaveBeenCalled();
  });

  it("marks FAILED with processingError when the provider fails analyzing", async () => {
    const mocks = buildMocks();
    const { repository, ai, questionRepository } = mocks;
    vi.mocked(repository.findById).mockResolvedValue(baseMaterial());
    vi.mocked(ai.analyzeMaterial).mockRejectedValue(new Error("connection reset"));

    const useCase = buildUseCase(mocks);
    const result = await useCase.execute("uuid-1");

    expect(result.material.processingStatus).toBe("FAILED");
    expect(result.material.processingError).toContain("Error del proveedor de IA al analizar");
    expect(result.material.processingError).toContain("connection reset");
    expect(questionRepository.replaceForMaterial).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the material does not exist", async () => {
    const mocks = buildMocks();
    vi.mocked(mocks.repository.findById).mockResolvedValue(null);

    const useCase = buildUseCase(mocks);

    await expect(useCase.execute("missing")).rejects.toThrow(
      'Material con id "missing" no encontrado.'
    );
    expect(mocks.repository.updateProcessingStatus).not.toHaveBeenCalled();
  });
});
