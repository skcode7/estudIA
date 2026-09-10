import { describe, expect, it, vi } from "vitest";

import { SubjectRecord, SubjectRepository } from "../ports/subject.repository";
import { GetSubjectUseCase } from "./get-subject.use-case";

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

describe("GetSubjectUseCase", () => {
  it("returns the subject when found", async () => {
    const repository = subjectRepositoryMock();
    const subject = baseSubject();
    vi.mocked(repository.findById).mockResolvedValue(subject);

    const useCase = new GetSubjectUseCase(repository);
    const result = await useCase.execute("uuid-1");

    expect(repository.findById).toHaveBeenCalledWith("uuid-1");
    expect(result).toEqual(subject);
  });

  it("throws NotFoundException when subject does not exist", async () => {
    const repository = subjectRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new GetSubjectUseCase(repository);

    await expect(useCase.execute("non-existent")).rejects.toThrow(
      'Materia con id "non-existent" no encontrada.'
    );
  });
});
