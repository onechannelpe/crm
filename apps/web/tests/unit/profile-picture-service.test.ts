import { describe, expect, it, vi } from "vitest";

import type { ProfilePictureBlobStore } from "../../src/server/users/profile-picture-blob-store";
import {
  createProfilePictureService,
  type AvatarUsersRepository,
} from "../../src/server/users/profile-picture-service";

type FindAvatarMetaById = AvatarUsersRepository["findAvatarMetaById"];
type UpdateAvatar = AvatarUsersRepository["updateAvatar"];
type ClearAvatar = AvatarUsersRepository["clearAvatar"];
type PutBlob = ProfilePictureBlobStore["put"];
type GetBlob = ProfilePictureBlobStore["get"];
type DeleteBlob = ProfilePictureBlobStore["delete"];

function createUsersRepoMock() {
  const findAvatarMetaById = vi.fn<FindAvatarMetaById>();
  const updateAvatar = vi.fn<UpdateAvatar>();
  const clearAvatar = vi.fn<ClearAvatar>();

  const users: AvatarUsersRepository = {
    findAvatarMetaById,
    updateAvatar,
    clearAvatar,
  };

  return { users, findAvatarMetaById, updateAvatar, clearAvatar };
}

function createBlobStoreMock() {
  const put = vi.fn<PutBlob>();
  const get = vi.fn<GetBlob>();
  const remove = vi.fn<DeleteBlob>();

  const blobStore: ProfilePictureBlobStore = {
    put,
    get,
    delete: remove,
  };

  return { blobStore, put, get, remove };
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
    blobStore.remove.mockImplementation(async (storageKey: string) => {
      if (storageKey === "10/old.png") {
        throw new Error("delete failed");
      }
    });

    const service = createProfilePictureService(
      { users: usersRepo.users },
      blobStore.blobStore,
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
    expect(blobStore.remove).toHaveBeenCalledWith("10/old.png");
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

    blobStore.remove.mockRejectedValue(new Error("delete failed"));

    const service = createProfilePictureService(
      { users: usersRepo.users },
      blobStore.blobStore,
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
      { users: usersRepo.users },
      blobStore.blobStore,
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
      { users: usersRepo.users },
      blobStore.blobStore,
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
      { users: usersRepo.users },
      blobStore.blobStore,
    );

    const result = await service.get(2);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("avatar_not_found");
    }
  });

  it("returns storage_unavailable when avatar bytes cannot be read", async () => {
    const usersRepo = createUsersRepoMock();
    const blobStore = createBlobStoreMock();

    usersRepo.findAvatarMetaById.mockResolvedValue({
      id: 2,
      avatar_storage_key: "2/avatar.png",
      avatar_mime_type: "image/png",
      avatar_updated_at: Date.now(),
      avatar_version: 6,
    });
    blobStore.get.mockRejectedValue(new Error("blob read failed"));

    const service = createProfilePictureService(
      { users: usersRepo.users },
      blobStore.blobStore,
    );

    const result = await service.get(2);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("storage_unavailable");
    }
  });
});
