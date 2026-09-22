import { describe, expect, it, vi } from "vitest";

import { AIProvider, MaterialAnalysis } from "../../../ai/application/ports/ai-provider";
import { ObjectStorage } from "../../../storage/application/ports/object-storage";
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

function baseAnalysis(): MaterialAnalysis {
  return {
    suggestedTitle: "Fotosíntesis",
    summary: "La fotosíntesis es el proceso de convertir luz en energía química.",
    concepts: ["fotosíntesis", "clorofila"],
    objectives: ["Entender la fotosíntesis"],
    extractedContent: "Texto transcrito por la IA."
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

function setupProcessingStatus(repository: MaterialRepository) {
  vi.mocked(repository.updateProcessingStatus).mockImplementation(async (id, status, error) =>
    baseMaterial({ id, processingStatus: status, processingError: error ?? null })
  );
}

describe("ProcessMaterialUseCase", () => {
  it("processes a TEXT material to COMPLETED and replaces questions", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    const ai = aiProviderMock();
    const storage = objectStorageMock();
    const material = baseMaterial();
    setupProcessingStatus(repository);
    vi.mocked(repository.findById).mockResolvedValue(material);
    vi.mocked(repository.updateFields).mockResolvedValue(
      baseMaterial({ title: "Fotosíntesis", content: "La fotosíntesis convierte la luz en energía química." })
    );
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(baseAnalysis());
    vi.mocked(ai.generateQuestions).mockResolvedValue(generatedQuestionPayload());
    vi.mocked(questionRepository.replaceForMaterial).mockResolvedValue(1);
    vi.mocked(storage.upload).mockResolvedValue({ key: "analysis.json", contentType: "application/json" });

    const useCase = new ProcessMaterialUseCase(repository, questionRepository, ai, storage, { questionsCount: 3 });
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
    expect(questionRepository.replaceForMaterial).toHaveBeenCalledWith(
      "uuid-1",
      generatedQuestionPayload()
    );
    expect(storage.upload).toHaveBeenCalledWith({
      key: "topics/topic-1/materials/uuid-1/analysis.json",
      body: expect.any(Buffer),
      contentType: "application/json"
    });
  });

  it("processes a supported FILE image (JPG) sending the image to the provider", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    const ai = aiProviderMock();
    const storage = objectStorageMock();
    const material = baseMaterial({
      type: "FILE",
      content: null,
      storageKey: "topics/topic-1/materials/foto.jpg"
    });
    setupProcessingStatus(repository);
    vi.mocked(repository.findById).mockResolvedValue(material);
    vi.mocked(storage.getObject).mockResolvedValue(Buffer.from("fake-image"));
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(baseAnalysis());
    vi.mocked(ai.generateQuestions).mockResolvedValue(generatedQuestionPayload());
    vi.mocked(questionRepository.replaceForMaterial).mockResolvedValue(1);

    const useCase = new ProcessMaterialUseCase(repository, questionRepository, ai, storage, { questionsCount: 3 });
    const result = await useCase.execute("uuid-1");

    expect(storage.getObject).toHaveBeenCalledWith("topics/topic-1/materials/foto.jpg");
    expect(ai.analyzeMaterial).toHaveBeenCalledWith(
      expect.objectContaining({
        image: { mimeType: "image/jpeg", body: expect.any(Buffer) }
      })
    );
    expect(result.material.processingStatus).toBe("COMPLETED");
  });

  it("marks FAILED when the file type is not a supported image", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    const ai = aiProviderMock();
    const storage = objectStorageMock();
    const material = baseMaterial({
      type: "FILE",
      content: null,
      storageKey: "topics/topic-1/materials/apunte.pdf"
    });
    setupProcessingStatus(repository);
    vi.mocked(repository.findById).mockResolvedValue(material);
    vi.mocked(storage.getObject).mockResolvedValue(Buffer.from("pdf"));

    const useCase = new ProcessMaterialUseCase(repository, questionRepository, ai, storage, { questionsCount: 3 });
    const result = await useCase.execute("uuid-1");

    expect(storage.getObject).toHaveBeenCalled();
    expect(ai.analyzeMaterial).not.toHaveBeenCalled();
    expect(ai.generateQuestions).not.toHaveBeenCalled();
    expect(result.material.processingStatus).toBe("FAILED");
    expect(result.material.processingError).toContain("solo se procesan imágenes");
    expect(result.questionCount).toBe(0);
  });

  it("marks FAILED when a TEXT material has no content", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    const ai = aiProviderMock();
    const storage = objectStorageMock();
    const material = baseMaterial({ content: null });
    setupProcessingStatus(repository);
    vi.mocked(repository.findById).mockResolvedValue(material);

    const useCase = new ProcessMaterialUseCase(repository, questionRepository, ai, storage, { questionsCount: 3 });
    const result = await useCase.execute("uuid-1");

    expect(result.material.processingStatus).toBe("FAILED");
    expect(result.material.processingError).toContain("no tiene contenido");
    expect(ai.analyzeMaterial).not.toHaveBeenCalled();
  });

  it("marks FAILED with processingError when the provider fails analyzing", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    const ai = aiProviderMock();
    const storage = objectStorageMock();
    const material = baseMaterial();
    setupProcessingStatus(repository);
    vi.mocked(repository.findById).mockResolvedValue(material);
    vi.mocked(ai.analyzeMaterial).mockRejectedValue(new Error("connection reset"));

    const useCase = new ProcessMaterialUseCase(repository, questionRepository, ai, storage, { questionsCount: 3 });
    const result = await useCase.execute("uuid-1");

    expect(result.material.processingStatus).toBe("FAILED");
    expect(result.material.processingError).toContain("Error del proveedor de IA al analizar");
    expect(result.material.processingError).toContain("connection reset");
    expect(questionRepository.replaceForMaterial).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the material does not exist", async () => {
    const repository = materialRepositoryMock();
    const questionRepository = questionRepositoryMock();
    const ai = aiProviderMock();
    const storage = objectStorageMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new ProcessMaterialUseCase(repository, questionRepository, ai, storage, { questionsCount: 3 });

    await expect(useCase.execute("missing")).rejects.toThrow(
      'Material con id "missing" no encontrado.'
    );
    expect(repository.updateProcessingStatus).not.toHaveBeenCalled();
  });
});