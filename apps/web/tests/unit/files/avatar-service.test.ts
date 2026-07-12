import { describe, expect, it, vi } from "vitest";

import type { BlobStore } from "~/server/shared/blob-store";
import { UserId } from "~/server/shared/ids";
import {
  createAvatarService,
  type AvatarUsersRepository,
} from "~/server/users/avatar-service";

type FindAvatarMetaById = AvatarUsersRepository["findAvatarMetaById"];
type UpdateAvatar = AvatarUsersRepository["updateAvatar"];
type ClearAvatar = AvatarUsersRepository["clearAvatar"];
type PutBlob = BlobStore["putBytes"];
type GetBlob = BlobStore["getBytes"];
type DeleteBlob = BlobStore["delete"];

function setup() {
  const findAvatarMetaById = vi.fn<FindAvatarMetaById>();
  const updateAvatar = vi.fn<UpdateAvatar>();
  const clearAvatar = vi.fn<ClearAvatar>();
  const putBytes = vi.fn<PutBlob>();
  const getBytes = vi.fn<GetBlob>();
  const remove = vi.fn<DeleteBlob>();

  const users: AvatarUsersRepository = {
    findAvatarMetaById,
    updateAvatar,
    clearAvatar,
  };
  const blobStore: BlobStore = {
    putBytes,
    getBytes,
    delete: remove,
    // Service never calls this; keep it explicit so the test stays aligned
    // with the real interface as it evolves.
    putFromWebStream: vi.fn<BlobStore["putFromWebStream"]>(),
  };
  const service = createAvatarService({ users }, blobStore);

  return {
    service,
    findAvatarMetaById,
    updateAvatar,
    clearAvatar,
    putBytes,
    getBytes,
    remove,
  };
}

function makeAvatar(
  overrides: Partial<{
    id: UserId;
    avatar_storage_key: string | null;
    avatar_mime_type: string | null;
    avatar_updated_at: Date | null;
    avatar_version: number;
  }> = {},
) {
  return {
    id: UserId.trust("10"),
    avatar_storage_key: "10/old.png",
    avatar_mime_type: "image/png",
    avatar_updated_at: new Date(),
    avatar_version: 2,
    ...overrides,
  };
}

describe("profile picture service", () => {
  it("keeps upload successful when old file cleanup fails", async () => {
    const { service, findAvatarMetaById, updateAvatar, putBytes, remove } =
      setup();

    findAvatarMetaById.mockResolvedValue(makeAvatar({ avatar_version: 2 }));
    updateAvatar.mockResolvedValue(undefined);
    putBytes.mockResolvedValue({ sha256: "x", sizeBytes: 3 });
    remove.mockImplementation(async (key: string) => {
      if (key === "10/old.png") throw new Error("delete failed");
    });

    const file = new File([new Uint8Array([1, 2, 3])], "avatar.png", {
      type: "image/png",
    });
    const result = await service.upload(UserId.trust("10"), file);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const value = result.value;
    expect(value.avatarVersion).toBe(3);
    expect(updateAvatar).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith("10/old.png");
  });

  it("keeps remove successful when old file cleanup fails", async () => {
    const { service, findAvatarMetaById, clearAvatar, remove } = setup();

    findAvatarMetaById.mockResolvedValue(makeAvatar({ avatar_version: 9 }));
    clearAvatar.mockResolvedValue(undefined);
    remove.mockRejectedValue(new Error("delete failed"));

    const result = await service.remove(UserId.trust("10"));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected success");
    const value = result.value;
    expect(value.avatarVersion).toBe(10);
    expect(clearAvatar).toHaveBeenCalledOnce();
  });

  it("rolls back new blob when db write fails during upload", async () => {
    const { service, findAvatarMetaById, updateAvatar, putBytes, remove } =
      setup();

    findAvatarMetaById.mockResolvedValue(makeAvatar());
    putBytes.mockResolvedValue({ sha256: "x", sizeBytes: 1 });
    updateAvatar.mockRejectedValue(new Error("db error"));
    remove.mockResolvedValue(undefined);

    const file = new File([new Uint8Array([1])], "avatar.png", {
      type: "image/png",
    });
    const result = await service.upload(UserId.trust("10"), file);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const error = result.error;
    expect(error.code).toBe("repository_unavailable");

    // The exact key written to storage must be the one rolled back,
    // not the old key, not some arbitrary key.
    const newKey = putBytes.mock.calls[0]?.[0];
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
      service.upload(UserId.trust("99"), file),
      service.remove(UserId.trust("99")),
    ]);

    expect(uploadResult.ok).toBe(false);
    if (uploadResult.ok) throw new Error("Expected failure");
    const uploadError = uploadResult.error;
    expect(uploadError.code).toBe("user_not_found");

    expect(removeResult.ok).toBe(false);
    if (removeResult.ok) throw new Error("Expected failure");
    const removeError = removeResult.error;
    expect(removeError.code).toBe("user_not_found");
  });

  it("rejects unsupported mime type", async () => {
    const { service } = setup();
    const file = new File([new Uint8Array([1])], "avatar.webp", {
      type: "image/webp",
    });
    const result = await service.upload(UserId.trust("1"), file);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const error = result.error;
    expect(error.code).toBe("unsupported_mime");
  });

  it("rejects empty file", async () => {
    const { service } = setup();
    const file = new File([], "avatar.png", { type: "image/png" });
    const result = await service.upload(UserId.trust("1"), file);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const error = result.error;
    expect(error.code).toBe("invalid_file");
  });

  it("rejects files larger than 10MB", async () => {
    const { service } = setup();
    const file = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "avatar.png",
      { type: "image/png" },
    );
    const result = await service.upload(UserId.trust("1"), file);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const error = result.error;
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
    const result = await service.get(UserId.trust("2"));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const error = result.error;
    expect(error.code).toBe("avatar_not_found");
  });

  it("returns storage_unavailable when avatar bytes cannot be read", async () => {
    const { service, findAvatarMetaById, getBytes } = setup();
    findAvatarMetaById.mockResolvedValue(
      makeAvatar({
        id: UserId.trust("2"),
        avatar_storage_key: "2/avatar.png",
        avatar_version: 6,
      }),
    );
    getBytes.mockRejectedValue(new Error("blob read failed"));
    const result = await service.get(UserId.trust("2"));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    const error = result.error;
    expect(error.code).toBe("storage_unavailable");
  });
});
