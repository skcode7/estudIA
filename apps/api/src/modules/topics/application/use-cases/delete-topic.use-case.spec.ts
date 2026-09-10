import { describe, expect, it, vi } from "vitest";

import { TopicRepository } from "../ports/topic.repository";
import { DeleteTopicUseCase } from "./delete-topic.use-case";

function topicRepositoryMock(): TopicRepository {
  return {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
}

describe("DeleteTopicUseCase", () => {
  it("deletes the topic when it exists", async () => {
    const repository = topicRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue({
      id: "uuid-1",
      subjectId: "subject-1",
      name: "Ecuaciones",
      description: null,
      createdAt: new Date("2026-09-10T00:00:00.000Z"),
      updatedAt: new Date("2026-09-10T00:00:00.000Z")
    });
    vi.mocked(repository.delete).mockResolvedValue(undefined);

    const useCase = new DeleteTopicUseCase(repository);
    await useCase.execute("uuid-1");

    expect(repository.delete).toHaveBeenCalledWith("uuid-1");
  });

  it("throws NotFoundException when topic does not exist", async () => {
    const repository = topicRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new DeleteTopicUseCase(repository);

    await expect(useCase.execute("non-existent")).rejects.toThrow(
      'Tema con id "non-existent" no encontrado.'
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
});