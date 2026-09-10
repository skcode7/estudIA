import { describe, expect, it, vi } from "vitest";

import { SubjectRecord, SubjectRepository } from "../ports/subject.repository";
import { CreateSubjectUseCase } from "./create-subject.use-case";

function subjectRepositoryMock(): SubjectRepository {
  return {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  };
}

describe("CreateSubjectUseCase", () => {
  it("creates a subject delegating to the repository", async () => {
    const repository = subjectRepositoryMock();
    const created: SubjectRecord = {
      id: "uuid-1",
      name: "Matemáticas",
      description: null,
      createdAt: new Date("2026-09-09T00:00:00.000Z"),
      updatedAt: new Date("2026-09-09T00:00:00.000Z")
    };
    vi.mocked(repository.create).mockResolvedValue(created);

    const useCase = new CreateSubjectUseCase(repository);
    const result = await useCase.execute({ name: "Matemáticas" });

    expect(repository.create).toHaveBeenCalledWith({ name: "Matemáticas" });
    expect(result).toEqual(created);
  });

  it("propagates the optional description", async () => {
    const repository = subjectRepositoryMock();
    vi.mocked(repository.create).mockImplementation(async (input) => ({
      id: "uuid-2",
      name: input.name,
      description: input.description ?? null,
      createdAt: new Date("2026-09-09T00:00:00.000Z"),
      updatedAt: new Date("2026-09-09T00:00:00.000Z")
    }));

    const useCase = new CreateSubjectUseCase(repository);
    await useCase.execute({ name: "Historia", description: "Historia universal" });

    expect(repository.create).toHaveBeenCalledWith({ name: "Historia", description: "Historia universal" });
  });
});