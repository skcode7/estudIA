import { describe, expect, it, vi } from "vitest";

import { SubjectRecord, SubjectRepository } from "../ports/subject.repository";
import { DeleteSubjectUseCase } from "./delete-subject.use-case";

function subjectRepositoryMock(): SubjectRepository {
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
    id: "uuid-1",
    name: "Matemáticas",
    description: null,
    createdAt: new Date("2026-09-09T00:00:00.000Z"),
    updatedAt: new Date("2026-09-09T00:00:00.000Z"),
    ...overrides
  };
}

describe("DeleteSubjectUseCase", () => {
  it("deletes the subject when found", async () => {
    const repository = subjectRepositoryMock();
    const existing = baseSubject();
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.delete).mockResolvedValue(undefined);

    const useCase = new DeleteSubjectUseCase(repository);
    await useCase.execute("uuid-1");

    expect(repository.findById).toHaveBeenCalledWith("uuid-1");
    expect(repository.delete).toHaveBeenCalledWith("uuid-1");
  });

  it("throws NotFoundException when subject does not exist", async () => {
    const repository = subjectRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new DeleteSubjectUseCase(repository);

    await expect(useCase.execute("non-existent")).rejects.toThrow(
      'Materia con id "non-existent" no encontrada.'
    );
  });

  it("does not call delete when subject is not found", async () => {
    const repository = subjectRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new DeleteSubjectUseCase(repository);

    await expect(useCase.execute("non-existent")).rejects.toThrow();
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
