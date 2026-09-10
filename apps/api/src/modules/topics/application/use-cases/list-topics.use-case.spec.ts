import { describe, expect, it, vi } from "vitest";

import { TopicRecord, TopicRepository } from "../ports/topic.repository";
import { ListTopicsUseCase } from "./list-topics.use-case";

function topicRepositoryMock(): TopicRepository {
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

describe("ListTopicsUseCase", () => {
  it("returns all topics when no subject is given", async () => {
    const repository = topicRepositoryMock();
    const topics = [baseTopic(), baseTopic({ id: "uuid-2", name: "Trigonometría" })];
    vi.mocked(repository.findAll).mockResolvedValue(topics);

    const useCase = new ListTopicsUseCase(repository);
    const result = await useCase.execute();

    expect(repository.findAll).toHaveBeenCalledWith({ subjectId: undefined });
    expect(result).toEqual(topics);
  });

  it("filters by subjectId when provided", async () => {
    const repository = topicRepositoryMock();
    vi.mocked(repository.findAll).mockResolvedValue([baseTopic()]);

    const useCase = new ListTopicsUseCase(repository);
    await useCase.execute("subject-1");

    expect(repository.findAll).toHaveBeenCalledWith({ subjectId: "subject-1" });
  });
});