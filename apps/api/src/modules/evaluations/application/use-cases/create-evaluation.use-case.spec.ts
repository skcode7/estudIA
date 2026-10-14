import { describe, expect, it, vi } from "vitest";

import { ObjectStorage } from "../../../storage/application/ports/object-storage";
import { TopicRecord, TopicRepository } from "../../../topics/application/ports/topic.repository";
import { EvaluationImageRecord, EvaluationImageRepository } from "../ports/evaluation-image.repository";
import { EvaluationRecord, EvaluationRepository } from "../ports/evaluation.repository";
import { CreateEvaluationUseCase } from "./create-evaluation.use-case";

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

function baseTopic(): TopicRecord {
  return {
    id: "topic-1",
    subjectId: "subject-1",
    name: "Números naturales",
    description: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z")
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

function setup() {
  const repository = evaluationRepositoryMock();
  const imageRepository = evaluationImageRepositoryMock();
  const topics = topicRepositoryMock();
  const objectStorage = objectStorageMock();

  vi.mocked(topics.findById).mockResolvedValue(baseTopic());
  vi.mocked(repository.create).mockImplementation((input) =>
    Promise.resolve(baseEvaluation({ id: input.id, title: input.title, dateTaken: input.dateTaken ?? null }))
  );
  vi.mocked(imageRepository.createMany).mockResolvedValue([] as EvaluationImageRecord[]);
  vi.mocked(objectStorage.upload).mockImplementation((input) =>
    Promise.resolve({ key: input.key, contentType: input.contentType })
  );
  vi.mocked(objectStorage.delete).mockResolvedValue(undefined);

  const useCase = new CreateEvaluationUseCase(
    repository,
    imageRepository,
    topics,
    objectStorage
  );
  return { repository, imageRepository, topics, objectStorage, useCase };
}

describe("CreateEvaluationUseCase", () => {
  it("uploads every photo and links them to the evaluation", async () => {
    const { useCase, imageRepository, objectStorage } = setup();

    const result = await useCase.execute({
      topicId: "topic-1",
      title: "  Examen unidad 1  ",
      images: [
        { originalName: "pagina1.jpg", contentType: "image/jpeg", body: Buffer.from("a") },
        { originalName: "pagina2.png", contentType: "image/png", body: Buffer.from("b") }
      ]
    });

    expect(objectStorage.upload).toHaveBeenCalledTimes(2);
    for (const [call] of vi.mocked(objectStorage.upload).mock.calls) {
      expect(call.key).toMatch(
        new RegExp(`^evaluations/${result.id}/images/[0-9a-f-]{36}\\.(jpg|png)$`)
      );
    }
    expect(imageRepository.createMany).toHaveBeenCalledWith(result.id, [
      { storageKey: expect.stringContaining(".jpg"), label: "Página 1", order: 0 },
      { storageKey: expect.stringContaining(".png"), label: "Página 2", order: 1 }
    ]);
    expect(result.title).toBe("Examen unidad 1");
  });

  it("rejects when the topic does not exist", async () => {
    const { useCase, topics, objectStorage } = setup();
    vi.mocked(topics.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({
        topicId: "missing",
        title: "Examen",
        images: [{ originalName: "a.jpg", contentType: "image/jpeg", body: Buffer.from("a") }]
      })
    ).rejects.toThrow('Tema con id "missing" no encontrado.');
    expect(objectStorage.upload).not.toHaveBeenCalled();
  });

  it("rejects files that are not images", async () => {
    const { useCase, objectStorage } = setup();

    await expect(
      useCase.execute({
        topicId: "topic-1",
        title: "Examen",
        images: [{ originalName: "examen.pdf", contentType: "application/pdf", body: Buffer.from("pdf") }]
      })
    ).rejects.toThrow("Solo se aceptan imágenes");
    expect(objectStorage.upload).not.toHaveBeenCalled();
  });

  it("cleans up the uploaded photos when one of them fails", async () => {
    const { useCase, objectStorage } = setup();
    vi.mocked(objectStorage.upload)
      .mockResolvedValueOnce({ key: "evaluations/x/images/one.jpg", contentType: "image/jpeg" })
      .mockRejectedValueOnce(new Error("s3 down"));

    await expect(
      useCase.execute({
        topicId: "topic-1",
        title: "Examen",
        images: [
          { originalName: "a.jpg", contentType: "image/jpeg", body: Buffer.from("a") },
          { originalName: "b.jpg", contentType: "image/jpeg", body: Buffer.from("b") }
        ]
      })
    ).rejects.toThrow("No se pudo guardar una de las fotos");
    expect(objectStorage.delete).toHaveBeenCalledWith("evaluations/x/images/one.jpg");
  });

  it("keeps the date only when it is a valid date", async () => {
    const { useCase, repository } = setup();

    const result = await useCase.execute({
      topicId: "topic-1",
      title: "Examen",
      dateTaken: "2026-05-14",
      images: [{ originalName: "a.jpg", contentType: "image/jpeg", body: Buffer.from("a") }]
    });

    expect(result.dateTaken).toEqual(new Date("2026-05-14"));
    expect(vi.mocked(repository.create).mock.calls[0]?.[0].dateTaken).toEqual(
      new Date("2026-05-14")
    );
  });
});