import { describe, expect, it, vi } from "vitest";

import { AIProvider, ExtractedEvaluationQuestion } from "../../../ai/application/ports/ai-provider";
import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { SubjectRecord, SubjectRepository } from "../../../subjects/application/ports/subject.repository";
import { TopicRepository } from "../../../topics/application/ports/topic.repository";
import { EvaluationImageRecord, EvaluationImageRepository } from "../ports/evaluation-image.repository";
import {
  EvaluationQuestionInput,
  EvaluationQuestionRepository
} from "../ports/evaluation-question.repository";
import { EvaluationRecord, EvaluationRepository } from "../ports/evaluation.repository";
import { ProcessEvaluationUseCase } from "./process-evaluation.use-case";

function aiProviderMock(): AIProvider {
  return {
    analyzeMaterial: vi.fn(),
    generateQuestions: vi.fn(),
    analyzeEvaluationDraft: vi.fn(),
    extractEvaluationQuestions: vi.fn(),
    explainAnswer: vi.fn(),
    generateHint: vi.fn()
  };
}

function evaluationRepositoryMock(): EvaluationRepository {
  return {
    create: vi.fn(),
    findByTopicIds: vi.fn(),
    findById: vi.fn(),
    updateProcessingStatus: vi.fn(),
    delete: vi.fn()
  };
}

function evaluationImageRepositoryMock(): EvaluationImageRepository {
  return {
    listByEvaluation: vi.fn(),
    createMany: vi.fn(),
    findById: vi.fn()
  };
}

function evaluationQuestionRepositoryMock(): EvaluationQuestionRepository {
  return {
    countByEvaluations: vi.fn(),
    replaceForEvaluation: vi.fn(),
    listByEvaluation: vi.fn(),
    findByIdForEvaluation: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
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

function objectStorageMock(): ObjectStorage {
  return {
    upload: vi.fn(),
    delete: vi.fn(),
    getObject: vi.fn(),
    getSignedUrl: vi.fn()
  };
}

function baseEvaluation(overrides: Partial<EvaluationRecord> = {}): EvaluationRecord {
  return {
    id: "evaluation-1",
    topicId: "topic-1",
    title: "Examen unidad 1",
    dateTaken: null,
    processingStatus: "PENDING",
    processingError: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    ...overrides
  };
}

function baseImage(order: number): EvaluationImageRecord {
  return {
    id: `image-${order}`,
    evaluationId: "evaluation-1",
    storageKey: `evaluations/evaluation-1/images/pagina${order}.jpg`,
    label: `Página ${order + 1}`,
    order,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z")
  };
}

function baseSubject(): SubjectRecord {
  return {
    id: "subject-1",
    name: "Matemáticas",
    description: null,
    color: "violet",
    icon: "subjects",
    materialsCount: 0,
    progress: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z")
  };
}

function extracted(
  overrides: Partial<ExtractedEvaluationQuestion> = {}
): ExtractedEvaluationQuestion {
  return {
    type: "MULTIPLE_CHOICE",
    statement: "¿Cuánto es 456 + 735?",
    difficulty: "medium",
    options: [
      { text: "1191", isCorrect: true },
      { text: "1179", isCorrect: false }
    ],
    ...overrides
  };
}

function setup() {
  const repository = evaluationRepositoryMock();
  const imageRepository = evaluationImageRepositoryMock();
  const questionRepository = evaluationQuestionRepositoryMock();
  const subjects = subjectRepositoryMock();
  const topics = topicRepositoryMock();
  const objectStorage = objectStorageMock();
  const ai = aiProviderMock();

  vi.mocked(repository.findById).mockResolvedValue(baseEvaluation());
  vi.mocked(repository.updateProcessingStatus).mockImplementation((_id, status, error = null) =>
    Promise.resolve(baseEvaluation({ processingStatus: status, processingError: error }))
  );
  vi.mocked(imageRepository.listByEvaluation).mockResolvedValue([baseImage(0), baseImage(1)]);
  vi.mocked(subjects.findById).mockResolvedValue(baseSubject());
  vi.mocked(topics.findById).mockImplementation(async (id: string) =>
    id === "topic-1"
      ? { id: "topic-1", subjectId: "subject-1", name: "Números", description: null, createdAt: new Date(), updatedAt: new Date() }
      : null
  );
  vi.mocked(objectStorage.getObject).mockImplementation((key: string) =>
    Promise.resolve(Buffer.from(key))
  );
  vi.mocked(questionRepository.replaceForEvaluation).mockResolvedValue(1);

  const useCase = new ProcessEvaluationUseCase(
    repository,
    imageRepository,
    questionRepository,
    ai,
    topics,
    subjects,
    objectStorage
  );
  return { repository, imageRepository, questionRepository, subjects, topics, objectStorage, ai, useCase };
}

describe("ProcessEvaluationUseCase", () => {
  it("asks the provider for the evaluation questions with the subject name", async () => {
    const { useCase, ai } = setup();
    vi.mocked(ai.extractEvaluationQuestions).mockResolvedValue([extracted()]);

    await useCase.execute("evaluation-1");

    expect(ai.extractEvaluationQuestions).toHaveBeenCalledWith({
      subjectName: "Matemáticas",
      title: "Examen unidad 1",
      images: [
        { mimeType: "image/jpeg", body: expect.any(Buffer) },
        { mimeType: "image/jpeg", body: expect.any(Buffer) }
      ]
    });
  });

  it("saves each question on the evaluation's topic and links its photo", async () => {
    const { useCase, ai, questionRepository } = setup();
    vi.mocked(ai.extractEvaluationQuestions).mockResolvedValue([
      extracted({ imageIndex: 1 })
    ]);

    const result = await useCase.execute("evaluation-1");

    const [evaluationId, inputs] =
      vi.mocked(questionRepository.replaceForEvaluation).mock.calls[0] ?? [];
    expect(evaluationId).toBe("evaluation-1");
    const [input] = (inputs ?? []) as EvaluationQuestionInput[];
    expect(input?.topicId).toBe("topic-1");
    expect(input?.evaluationImageId).toBe("image-1");
    expect(result.evaluation.processingStatus).toBe("COMPLETED");
    expect(result.questionCount).toBe(1);
  });

  it("fails when the provider throws", async () => {
    const { useCase, ai } = setup();
    vi.mocked(ai.extractEvaluationQuestions).mockRejectedValue(new Error("connection reset"));

    const result = await useCase.execute("evaluation-1");

    expect(result.evaluation.processingStatus).toBe("FAILED");
    expect(result.evaluation.processingError).toContain("Error del proveedor de IA");
  });

  it("fails when the evaluation has no photos", async () => {
    const { useCase, ai, imageRepository } = setup();
    vi.mocked(imageRepository.listByEvaluation).mockResolvedValue([]);

    const result = await useCase.execute("evaluation-1");

    expect(ai.extractEvaluationQuestions).not.toHaveBeenCalled();
    expect(result.evaluation.processingError).toBe("La evaluación no tiene fotos que leer.");
  });

  it("fails when the topic does not exist", async () => {
    const { useCase, ai, topics } = setup();
    vi.mocked(topics.findById).mockResolvedValue(null);

    const result = await useCase.execute("evaluation-1");

    expect(ai.extractEvaluationQuestions).not.toHaveBeenCalled();
    expect(result.evaluation.processingError).toBe("El tema de la evaluación ya no existe.");
  });

  it("fails when the subject does not exist", async () => {
    const { useCase, ai, subjects } = setup();
    vi.mocked(subjects.findById).mockResolvedValue(null);

    const result = await useCase.execute("evaluation-1");

    expect(ai.extractEvaluationQuestions).not.toHaveBeenCalled();
    expect(result.evaluation.processingError).toBe("La materia del tema ya no existe.");
  });

  it("throws NotFoundException when the evaluation does not exist", async () => {
    const { useCase, repository } = setup();
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(useCase.execute("missing")).rejects.toThrow(
      'Evaluación con id "missing" no encontrada.'
    );
  });
});