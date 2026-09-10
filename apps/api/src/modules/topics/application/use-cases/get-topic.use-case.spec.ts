import { describe, expect, it, vi } from "vitest";

import { TopicRecord, TopicRepository } from "../ports/topic.repository";
import { GetTopicUseCase } from "./get-topic.use-case";

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

describe("GetTopicUseCase", () => {
  it("returns the topic when found", async () => {
    const repository = topicRepositoryMock();
    const topic = baseTopic();
    vi.mocked(repository.findById).mockResolvedValue(topic);

    const useCase = new GetTopicUseCase(repository);
    const result = await useCase.execute("uuid-1");

    expect(repository.findById).toHaveBeenCalledWith("uuid-1");
    expect(result).toEqual(topic);
  });

  it("throws NotFoundException when topic does not exist", async () => {
    const repository = topicRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new GetTopicUseCase(repository);

    await expect(useCase.execute("non-existent")).rejects.toThrow(
      'Tema con id "non-existent" no encontrado.'
    );
  });
});