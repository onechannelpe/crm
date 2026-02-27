import { describe, expect, it, vi } from "vitest";

import { createProfilePictureService } from "../../src/server/users/profile-picture-service";

function createUsersRepoMock() {
  return {
    findAvatarMetaById: vi.fn(),
    updateAvatar: vi.fn(),
    clearAvatar: vi.fn(),
  };
}

function createBlobStoreMock() {
  return {
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  };
}

describe("profile picture service", () => {
  it("keeps upload successful when old file cleanup fails", async () => {
    const usersRepo = createUsersRepoMock();
    const blobStore = createBlobStoreMock();

    usersRepo.findAvatarMetaById.mockResolvedValue({
      id: 10,
      avatar_storage_key: "10/old.png",
      avatar_mime_type: "image/png",
      avatar_updated_at: Date.now(),
      avatar_version: 2,
    });
    usersRepo.updateAvatar.mockResolvedValue(undefined);

    blobStore.put.mockResolvedValue(undefined);
    blobStore.delete.mockImplementation(async (storageKey: string) => {
      if (storageKey === "10/old.png") {
        throw new Error("delete failed");
      }
    });

    const service = createProfilePictureService(
      { users: usersRepo },
      blobStore,
    );

    const file = new File([new Uint8Array([1, 2, 3])], "avatar.png", {
      type: "image/png",
    });

    const result = await service.upload(10, file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.avatarVersion).toBe(3);
    }
    expect(usersRepo.updateAvatar).toHaveBeenCalledOnce();
    expect(blobStore.delete).toHaveBeenCalledWith("10/old.png");
  });

  it("keeps remove successful when old file cleanup fails", async () => {
    const usersRepo = createUsersRepoMock();
    const blobStore = createBlobStoreMock();

    usersRepo.findAvatarMetaById.mockResolvedValue({
      id: 10,
      avatar_storage_key: "10/old.png",
      avatar_mime_type: "image/png",
      avatar_updated_at: Date.now(),
      avatar_version: 9,
    });
    usersRepo.clearAvatar.mockResolvedValue(undefined);

    blobStore.delete.mockRejectedValue(new Error("delete failed"));

    const service = createProfilePictureService(
      { users: usersRepo },
      blobStore,
    );

    const result = await service.remove(10);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.avatarVersion).toBe(10);
    }
    expect(usersRepo.clearAvatar).toHaveBeenCalledOnce();
  });

  it("rejects unsupported mime type", async () => {
    const usersRepo = createUsersRepoMock();
    const blobStore = createBlobStoreMock();
    const service = createProfilePictureService(
      { users: usersRepo },
      blobStore,
    );

    const file = new File([new Uint8Array([1])], "avatar.webp", {
      type: "image/webp",
    });

    const result = await service.upload(1, file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unsupported_mime");
    }
  });

  it("rejects files larger than 10MB", async () => {
    const usersRepo = createUsersRepoMock();
    const blobStore = createBlobStoreMock();
    const service = createProfilePictureService(
      { users: usersRepo },
      blobStore,
    );

    const bytes = new Uint8Array(10 * 1024 * 1024 + 1);
    const file = new File([bytes], "avatar.png", { type: "image/png" });

    const result = await service.upload(1, file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("too_large");
    }
  });

  it("returns avatar_not_found when no avatar exists for read", async () => {
    const usersRepo = createUsersRepoMock();
    const blobStore = createBlobStoreMock();

    usersRepo.findAvatarMetaById.mockResolvedValue({
      id: 2,
      avatar_storage_key: null,
      avatar_mime_type: null,
      avatar_updated_at: null,
      avatar_version: 0,
    });

    const service = createProfilePictureService(
      { users: usersRepo },
      blobStore,
    );

    const result = await service.get(2);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("avatar_not_found");
    }
  });
});
