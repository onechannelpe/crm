import { expectErr, expectOk } from "@tests/support/_core/assertions";
import { describe, expect, it, vi } from "vitest";

import type { ProfilePictureBlobStore } from "~/server/users/profile-picture-blob-store";
import {
  createProfilePictureService,
  type AvatarUsersRepository,
} from "~/server/users/profile-picture-service";

type FindAvatarMetaById = AvatarUsersRepository["findAvatarMetaById"];
type UpdateAvatar = AvatarUsersRepository["updateAvatar"];
type ClearAvatar = AvatarUsersRepository["clearAvatar"];
type PutBlob = ProfilePictureBlobStore["put"];
type GetBlob = ProfilePictureBlobStore["get"];
type DeleteBlob = ProfilePictureBlobStore["delete"];

function setup() {
  const findAvatarMetaById = vi.fn<FindAvatarMetaById>();
  const updateAvatar = vi.fn<UpdateAvatar>();
  const clearAvatar = vi.fn<ClearAvatar>();
  const put = vi.fn<PutBlob>();
  const get = vi.fn<GetBlob>();
  const remove = vi.fn<DeleteBlob>();

  const users: AvatarUsersRepository = {
    findAvatarMetaById,
    updateAvatar,
    clearAvatar,
  };
  const blobStore: ProfilePictureBlobStore = { put, get, delete: remove };
  const service = createProfilePictureService({ users }, blobStore);

  return {
    service,
    findAvatarMetaById,
    updateAvatar,
    clearAvatar,
    put,
    get,
    remove,
  };
}

function makeAvatar(
  overrides: Partial<{
    id: number;
    avatar_storage_key: string | null;
    avatar_mime_type: string | null;
    avatar_updated_at: number | null;
    avatar_version: number;
  }> = {},
) {
  return {
    id: 10,
    avatar_storage_key: "10/old.png",
    avatar_mime_type: "image/png",
    avatar_updated_at: Date.now(),
    avatar_version: 2,
    ...overrides,
  };
}

describe("profile picture service", () => {
  it("keeps upload successful when old file cleanup fails", async () => {
    const { service, findAvatarMetaById, updateAvatar, put, remove } = setup();

    findAvatarMetaById.mockResolvedValue(makeAvatar({ avatar_version: 2 }));
    updateAvatar.mockResolvedValue(undefined);
    put.mockResolvedValue(undefined);
    remove.mockImplementation(async (key) => {
      if (key === "10/old.png") throw new Error("delete failed");
    });

    const file = new File([new Uint8Array([1, 2, 3])], "avatar.png", {
      type: "image/png",
    });
    const result = await service.upload(10, file);

    const value = expectOk(result);
    expect(value.avatarVersion).toBe(3);
    expect(updateAvatar).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith("10/old.png");
  });

  it("keeps remove successful when old file cleanup fails", async () => {
    const { service, findAvatarMetaById, clearAvatar, remove } = setup();

    findAvatarMetaById.mockResolvedValue(makeAvatar({ avatar_version: 9 }));
    clearAvatar.mockResolvedValue(undefined);
    remove.mockRejectedValue(new Error("delete failed"));

    const result = await service.remove(10);

    const value = expectOk(result);
    expect(value.avatarVersion).toBe(10);
    expect(clearAvatar).toHaveBeenCalledOnce();
  });

  it("rolls back new blob when db write fails during upload", async () => {
    const { service, findAvatarMetaById, updateAvatar, put, remove } = setup();

    findAvatarMetaById.mockResolvedValue(makeAvatar());
    put.mockResolvedValue(undefined);
    updateAvatar.mockRejectedValue(new Error("db error"));
    remove.mockResolvedValue(undefined);

    const file = new File([new Uint8Array([1])], "avatar.png", {
      type: "image/png",
    });
    const result = await service.upload(10, file);

    const error = expectErr(result);
    expect(error.code).toBe("repository_unavailable");

    // The exact key written to storage must be the one rolled back,
    // not the old key, not some arbitrary key.
    const newKey = put.mock.calls[0]?.[0];
    expect(newKey).toBeDefined();
    expect(remove).toHaveBeenCalledExactlyOnceWith(newKey);
  });

  it("returns user_not_found when user record is missing", async () => {
    const { service, findAvatarMetaById } = setup();
    findAvatarMetaById.mockResolvedValue(undefined);

    const file = new File([new Uint8Array([1])], "avatar.png", {
      type: "image/png",
    });
    const [uploadResult, removeResult] = await Promise.all([
      service.upload(99, file),
      service.remove(99),
    ]);

    const uploadError = expectErr(uploadResult);
    expect(uploadError.code).toBe("user_not_found");

    const removeError = expectErr(removeResult);
    expect(removeError.code).toBe("user_not_found");
  });

  it("rejects unsupported mime type", async () => {
    const { service } = setup();
    const file = new File([new Uint8Array([1])], "avatar.webp", {
      type: "image/webp",
    });
    const result = await service.upload(1, file);
    const error = expectErr(result);
    expect(error.code).toBe("unsupported_mime");
  });

  it("rejects empty file", async () => {
    const { service } = setup();
    const file = new File([], "avatar.png", { type: "image/png" });
    const result = await service.upload(1, file);
    const error = expectErr(result);
    expect(error.code).toBe("invalid_file");
  });

  it("rejects files larger than 10MB", async () => {
    const { service } = setup();
    const file = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "avatar.png",
      { type: "image/png" },
    );
    const result = await service.upload(1, file);
    const error = expectErr(result);
    expect(error.code).toBe("too_large");
  });

  it("returns avatar_not_found when no avatar exists for read", async () => {
    const { service, findAvatarMetaById } = setup();
    findAvatarMetaById.mockResolvedValue(
      makeAvatar({
        avatar_storage_key: null,
        avatar_mime_type: null,
        avatar_updated_at: null,
        avatar_version: 0,
      }),
    );
    const result = await service.get(2);
    const error = expectErr(result);
    expect(error.code).toBe("avatar_not_found");
  });

  it("returns storage_unavailable when avatar bytes cannot be read", async () => {
    const { service, findAvatarMetaById, get } = setup();
    findAvatarMetaById.mockResolvedValue(
      makeAvatar({
        id: 2,
        avatar_storage_key: "2/avatar.png",
        avatar_version: 6,
      }),
    );
    get.mockRejectedValue(new Error("blob read failed"));
    const result = await service.get(2);
    const error = expectErr(result);
    expect(error.code).toBe("storage_unavailable");
  });
});
