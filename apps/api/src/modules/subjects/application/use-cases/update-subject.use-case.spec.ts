import { describe, expect, it, vi } from "vitest";

import { SubjectRecord, SubjectRepository } from "../ports/subject.repository";
import { UpdateSubjectUseCase } from "./update-subject.use-case";

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

describe("UpdateSubjectUseCase", () => {
  it("updates and returns the subject", async () => {
    const repository = subjectRepositoryMock();
    const existing = baseSubject();
    const updated = baseSubject({ name: "Matemáticas II" });
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockResolvedValue(updated);

    const useCase = new UpdateSubjectUseCase(repository);
    const result = await useCase.execute("uuid-1", { name: "Matemáticas II" });

    expect(repository.findById).toHaveBeenCalledWith("uuid-1");
    expect(repository.update).toHaveBeenCalledWith("uuid-1", { name: "Matemáticas II" });
    expect(result).toEqual(updated);
  });

  it("throws NotFoundException when subject does not exist", async () => {
    const repository = subjectRepositoryMock();
    vi.mocked(repository.findById).mockResolvedValue(null);

    const useCase = new UpdateSubjectUseCase(repository);

    await expect(useCase.execute("non-existent", { name: "X" })).rejects.toThrow(
      'Materia con id "non-existent" no encontrada.'
    );
  });

  it("propagates description update", async () => {
    const repository = subjectRepositoryMock();
    const existing = baseSubject();
    const updated = baseSubject({ description: "Nueva descripción" });
    vi.mocked(repository.findById).mockResolvedValue(existing);
    vi.mocked(repository.update).mockResolvedValue(updated);

    const useCase = new UpdateSubjectUseCase(repository);
    await useCase.execute("uuid-1", { description: "Nueva descripción" });

    expect(repository.update).toHaveBeenCalledWith("uuid-1", { description: "Nueva descripción" });
  });
});
