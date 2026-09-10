import { describe, expect, it, vi } from "vitest";

import { UserRecord, UserRepository } from "../ports/user.repository";
import { ListUsersUseCase } from "./list-users.use-case";

function userRepositoryMock(): UserRepository {
  return {
    findAll: vi.fn(),
    create: vi.fn()
  };
}

describe("ListUsersUseCase", () => {
  it("returns all users from the repository", async () => {
    const repository = userRepositoryMock();
    const users: UserRecord[] = [
      {
        id: "uuid-1",
        name: "Alex",
        createdAt: new Date("2026-09-10T00:00:00.000Z"),
        updatedAt: new Date("2026-09-10T00:00:00.000Z")
      }
    ];
    vi.mocked(repository.findAll).mockResolvedValue(users);

    const useCase = new ListUsersUseCase(repository);
    const result = await useCase.execute();

    expect(repository.findAll).toHaveBeenCalledOnce();
    expect(result).toEqual(users);
  });

  it("returns an empty array when no users exist", async () => {
    const repository = userRepositoryMock();
    vi.mocked(repository.findAll).mockResolvedValue([]);

    const useCase = new ListUsersUseCase(repository);
    const result = await useCase.execute();

    expect(result).toEqual([]);
  });
});