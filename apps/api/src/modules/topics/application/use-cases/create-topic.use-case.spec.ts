import { describe, expect, it, vi } from "vitest";

import { SubjectRecord, SubjectRepository } from "../../../subjects/application/ports/subject.repository";
import { TopicRecord, TopicRepository } from "../ports/topic.repository";
import { CreateTopicUseCase } from "./create-topic.use-case";

function topicRepositoryMock(): TopicRepository {
  return {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
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

function baseTopic(overrides: Partial<TopicRecord> = {}): TopicRecord {
  return {
    id: "uuid-1",
    subjectId: "subject-1",
    name: "Ecuaciones de segundo grado",
    description: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

function baseSubject(overrides: Partial<SubjectRecord> = {}): SubjectRecord {
  return {
    id: "subject-1",
    name: "Matemáticas",
    description: null,
    createdAt: new Date("2026-09-10T00:00:00.000Z"),
    updatedAt: new Date("2026-09-10T00:00:00.000Z"),
    ...overrides
  };
}

describe("CreateTopicUseCase", () => {
  it("creates a topic delegating to the repository", async () => {
    const repository = topicRepositoryMock();
    const subjectRepository = subjectRepositoryMock();
    const created = baseTopic();
    vi.mocked(subjectRepository.findById).mockResolvedValue(baseSubject());
    vi.mocked(repository.create).mockResolvedValue(created);

    const useCase = new CreateTopicUseCase(repository, subjectRepository);
    const result = await useCase.execute({ subjectId: "subject-1", name: "Ecuaciones de segundo grado" });

    expect(subjectRepository.findById).toHaveBeenCalledWith("subject-1");
    expect(repository.create).toHaveBeenCalledWith({
      subjectId: "subject-1",
      name: "Ecuaciones de segundo grado"
    });
    expect(result).toEqual(created);
  });

  it("propagates the optional description", async () => {
    const repository = topicRepositoryMock();
    const subjectRepository = subjectRepositoryMock();
    vi.mocked(subjectRepository.findById).mockResolvedValue(baseSubject());
    vi.mocked(repository.create).mockImplementation(async (input) => baseTopic({ description: input.description ?? null }));

    const useCase = new CreateTopicUseCase(repository, subjectRepository);
    await useCase.execute({ subjectId: "subject-1", name: "Tema", description: "Descripción" });

    expect(repository.create).toHaveBeenCalledWith({
      subjectId: "subject-1",
      name: "Tema",
      description: "Descripción"
    });
  });

  it("throws NotFoundException when subject does not exist", async () => {
    const repository = topicRepositoryMock();
    const subjectRepository = subjectRepositoryMock();
    vi.mocked(subjectRepository.findById).mockResolvedValue(null);

    const useCase = new CreateTopicUseCase(repository, subjectRepository);

    await expect(
      useCase.execute({ subjectId: "missing", name: "Tema" })
    ).rejects.toThrow('Materia con id "missing" no encontrada.');
    expect(repository.create).not.toHaveBeenCalled();
  });
});