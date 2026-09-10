import { describe, expect, it, vi } from "vitest";

import { UserRecord, UserRepository } from "../ports/user.repository";
import { CreateUserUseCase } from "./create-user.use-case";

function userRepositoryMock(): UserRepository {
  return {
    findAll: vi.fn(),
    create: vi.fn()
  };
}

describe("CreateUserUseCase", () => {
  it("creates a user delegating to the repository", async () => {
    const repository = userRepositoryMock();
    const created: UserRecord = {
      id: "uuid-1",
      name: "Alex",
      createdAt: new Date("2026-09-10T00:00:00.000Z"),
      updatedAt: new Date("2026-09-10T00:00:00.000Z")
    };
    vi.mocked(repository.create).mockResolvedValue(created);

    const useCase = new CreateUserUseCase(repository);
    const result = await useCase.execute({ name: "Alex" });

    expect(repository.create).toHaveBeenCalledWith({ name: "Alex" });
    expect(result).toEqual(created);
  });
});