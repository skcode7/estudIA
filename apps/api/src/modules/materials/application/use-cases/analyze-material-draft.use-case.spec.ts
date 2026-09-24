import { describe, expect, it, vi } from "vitest";

import { AIProvider, MaterialAnalysis } from "../../../ai/application/ports/ai-provider";
import { SubjectRecord, SubjectRepository } from "../../../subjects/application/ports/subject.repository";
import { TopicRecord, TopicRepository } from "../../../topics/application/ports/topic.repository";
import { AnalyzeMaterialDraftUseCase } from "./analyze-material-draft.use-case";

function aiProviderMock(): AIProvider {
  return {
    analyzeMaterial: vi.fn(),
    generateQuestions: vi.fn(),
    explainAnswer: vi.fn(),
    generateHint: vi.fn()
  };
}

function subjectRepositoryMock(): SubjectRepository {
  return {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
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

function baseSubject(overrides: Partial<SubjectRecord> = {}): SubjectRecord {
  return {
    id: "subject-1",
    name: "Biología",
    description: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

function baseTopic(overrides: Partial<TopicRecord> = {}): TopicRecord {
  return {
    id: "topic-1",
    subjectId: "subject-1",
    name: "Fotosíntesis",
    description: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

function baseAnalysis(overrides: Partial<MaterialAnalysis> = {}): MaterialAnalysis {
  return {
    suggestedTitle: "Fotosíntesis",
    suggestedSubjectId: "subject-1",
    suggestedTopicId: "topic-1",
    summary: "La fotosíntesis convierte la luz en energía química.",
    concepts: ["fotosíntesis"],
    objectives: ["Entender la fotosíntesis"],
    extractedContent: "Texto transcrito por la IA.",
    ...overrides
  };
}

function setup() {
  const ai = aiProviderMock();
  const subjectRepository = subjectRepositoryMock();
  const topicRepository = topicRepositoryMock();
  vi.mocked(subjectRepository.findAll).mockResolvedValue([baseSubject()]);
  vi.mocked(topicRepository.findAll).mockResolvedValue([baseTopic()]);
  const useCase = new AnalyzeMaterialDraftUseCase(ai, subjectRepository, topicRepository);
  return { ai, subjectRepository, topicRepository, useCase };
}

describe("AnalyzeMaterialDraftUseCase", () => {
  it("analyzes a supported image and resolves the suggested subject and topic", async () => {
    const { ai, useCase } = setup();
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(baseAnalysis());

    const result = await useCase.execute({
      image: {
        mimeType: "image/jpeg",
        body: Buffer.from("fake-image"),
        originalName: "apuntes.jpg"
      }
    });

    expect(ai.analyzeMaterial).toHaveBeenCalledWith({
      content: "",
      image: { mimeType: "image/jpeg", body: expect.any(Buffer) },
      catalog: [
        {
          id: "subject-1",
          name: "Biología",
          topics: [{ id: "topic-1", name: "Fotosíntesis" }]
        }
      ]
    });
    expect(result).toEqual({
      suggestedSubjectId: "subject-1",
      suggestedTopicId: "topic-1",
      suggestedTitle: "Fotosíntesis",
      extractedContent: "Texto transcrito por la IA.",
      hasEmbeddedFigures: false
    });
  });

  it("reports the embedded figures detected in the image", async () => {
    const { ai, useCase } = setup();
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(
      baseAnalysis({ hasEmbeddedFigures: true })
    );

    const result = await useCase.execute({
      image: {
        mimeType: "image/jpeg",
        body: Buffer.from("fake-image"),
        originalName: "apuntes.jpg"
      }
    });

    expect(result.hasEmbeddedFigures).toBe(true);
  });

  it("analyzes plain text and leaves extracted content null", async () => {
    const { ai, useCase } = setup();
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(
      baseAnalysis({ extractedContent: "  Apuntes de fotosíntesis.  " })
    );

    const result = await useCase.execute({ text: "Apuntes de fotosíntesis." });

    expect(ai.analyzeMaterial).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Apuntes de fotosíntesis.", image: null })
    );
    expect(result.extractedContent).toBe("Apuntes de fotosíntesis.");
  });

  it("ignores suggested ids that are not in the catalog", async () => {
    const { ai, useCase } = setup();
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(
      baseAnalysis({ suggestedSubjectId: "invented-subject", suggestedTopicId: "invented-topic" })
    );

    const result = await useCase.execute({ text: "Apuntes." });

    expect(result.suggestedSubjectId).toBeNull();
    expect(result.suggestedTopicId).toBeNull();
  });

  it("falls back to the topic's subject when the suggested subject does not match", async () => {
    const { ai, useCase } = setup();
    vi.mocked(ai.analyzeMaterial).mockResolvedValue(
      baseAnalysis({ suggestedSubjectId: "invented-subject", suggestedTopicId: "topic-1" })
    );

    const result = await useCase.execute({ text: "Apuntes." });

    expect(result.suggestedSubjectId).toBe("subject-1");
    expect(result.suggestedTopicId).toBe("topic-1");
  });

  it("rejects when neither text nor image is provided", async () => {
    const { ai, useCase } = setup();

    await expect(useCase.execute({ text: "   " })).rejects.toThrow(
      "Proporciona una foto, un archivo o un texto para analizar."
    );
    expect(ai.analyzeMaterial).not.toHaveBeenCalled();
  });

  it("rejects files that are not supported images", async () => {
    const { ai, useCase } = setup();

    await expect(
      useCase.execute({
        image: { mimeType: "application/pdf", body: Buffer.from("pdf"), originalName: "apunte.pdf" }
      })
    ).rejects.toThrow("solo se analizan imágenes");
    expect(ai.analyzeMaterial).not.toHaveBeenCalled();
  });

  it("throws ServiceUnavailableException when the provider fails", async () => {
    const { ai, useCase } = setup();
    vi.mocked(ai.analyzeMaterial).mockRejectedValue(new Error("connection reset"));

    await expect(useCase.execute({ text: "Apuntes." })).rejects.toThrow(
      "La IA no pudo extraer la información. Intenta de nuevo."
    );
  });
});
