import { describe, expect, it, vi } from "vitest";

import { TopicRecord, TopicRepository } from "../ports/topic.repository";
import { UpdateTopicUseCase } from "./update-topic.use-case";

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

describe("UpdateTopicUseCase", () => {
  it("updates and returns the topic", async () => {
    const repository = topicRepositoryMock();
    const existing = baseTopic();
    const updated = baseTopic({ name: "Ecuaciones (repaso)" });
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockResolvedValue(updated);

    const useCase = new UpdateTopicUseCase(repository);
    const result = await useCase.execute("uuid-1", { name: "Ecuaciones (repaso)" });

    expect(repository.findById).toHaveBeenCalledWith("uuid-1");
    expect(repository.update).toHaveBeenCalledWith("uuid-1", { name: "Ecuaciones (repaso)" });
    expect(result).toEqual(updated);
  });

  it("throws NotFoundException when topic does not exist", async () => {
    const repository = topicRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new UpdateTopicUseCase(repository);

    await expect(useCase.execute("non-existent", { name: "X" })).rejects.toThrow(
      'Tema con id "non-existent" no encontrado.'
    );
  });

  it("propagates description update", async () => {
    const repository = topicRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(baseTopic());
    vi.mocked(repository.update).mockResolvedValue(baseTopic({ description: "Nueva descripción" }));

    const useCase = new UpdateTopicUseCase(repository);
    await useCase.execute("uuid-1", { description: "Nueva descripción" });

    expect(repository.update).toHaveBeenCalledWith("uuid-1", { description: "Nueva descripción" });
  });
});