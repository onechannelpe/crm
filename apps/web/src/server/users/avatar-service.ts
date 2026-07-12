import { createLogger } from "~/lib/observability/logger";
import type { BlobStore } from "~/server/shared/blob-store";
import type { UserId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";
import { Err, Ok } from "~/server/shared/result";

const MAX_PROFILE_PICTURE_BYTES = 10 * 1024 * 1024;
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
};
const logger = createLogger("avatar-service");

export type AvatarDomainErrorCode =
  | "invalid_file"
  | "too_large"
  | "unsupported_mime"
  | "user_not_found"
  | "storage_unavailable"
  | "repository_unavailable"
  | "avatar_not_found";

export interface AvatarDomainError {
  code: AvatarDomainErrorCode;
}

export interface AvatarRecord {
  storageKey: string;
  mimeType: string;
  version: number;
  updatedAt: Date;
  bytes: Uint8Array;
}

export interface AvatarMetaRow {
  id: UserId;
  avatar_storage_key: string | null;
  avatar_mime_type: string | null;
  avatar_updated_at: Date | null;
  avatar_version: number;
}

export interface AvatarService {
  upload(
    userId: UserId,
    file: File,
  ): Promise<Result<{ avatarVersion: number }, AvatarDomainError>>;
  remove(
    userId: UserId,
  ): Promise<Result<{ avatarVersion: number }, AvatarDomainError>>;
  get(userId: UserId): Promise<Result<AvatarRecord, AvatarDomainError>>;
}

export interface AvatarUsersRepository {
  findAvatarMetaById: (
    userId: UserId,
  ) => Promise<AvatarMetaRow | null | undefined>;
  updateAvatar: (
    userId: UserId,
    values: {
      storage_key: string;
      mime_type: string;
      updated_at: Date;
      version: number;
    },
  ) => Promise<unknown>;
  clearAvatar: (
    userId: UserId,
    values: {
      updated_at: Date;
      version: number;
    },
  ) => Promise<unknown>;
}

function validateFile(file: File): Result<void, AvatarDomainError> {
  if (file.size <= 0) {
    return Err({ code: "invalid_file" });
  }
  if (file.size > MAX_PROFILE_PICTURE_BYTES) {
    return Err({ code: "too_large" });
  }
  if (!(file.type in MIME_TO_EXTENSION)) {
    return Err({ code: "unsupported_mime" });
  }
  return Ok(undefined);
}

export function createAvatarService(
  repos: { users: AvatarUsersRepository },
  blobStore: BlobStore,
): AvatarService {
  return {
    async upload(userId: UserId, file: File) {
      const validation = validateFile(file);
      if (!validation.ok) {
        return validation;
      }

      let currentAvatar: AvatarMetaRow | null | undefined;
      try {
        currentAvatar = await repos.users.findAvatarMetaById(userId);
      } catch {
        return Err({ code: "repository_unavailable" });
      }

      if (!currentAvatar) {
        return Err({ code: "user_not_found" });
      }

      const extension = MIME_TO_EXTENSION[file.type];
      if (!extension) {
        return Err({ code: "unsupported_mime" });
      }

      const storageKey = `${userId}/${crypto.randomUUID()}.${extension}`;
      const content = new Uint8Array(await file.arrayBuffer());
      const nextVersion = currentAvatar.avatar_version + 1;
      const updatedAt = new Date();

      try {
        await blobStore.putBytes(storageKey, content);
      } catch {
        return Err({ code: "storage_unavailable" });
      }

      try {
        await repos.users.updateAvatar(userId, {
          storage_key: storageKey,
          mime_type: file.type,
          updated_at: updatedAt,
          version: nextVersion,
        });
      } catch {
        try {
          await blobStore.delete(storageKey);
        } catch {
          // Already mapped to repository_unavailable; a second blob failure
          // cannot change the surfaced error.
        }
        return Err({ code: "repository_unavailable" });
      }

      if (currentAvatar.avatar_storage_key) {
        try {
          await blobStore.delete(currentAvatar.avatar_storage_key);
        } catch (error) {
          logger.error("avatar_cleanup_failed", {
            operation: "upload",
            userId,
            oldStorageKey: currentAvatar.avatar_storage_key,
            error,
          });
        }
      }

      return Ok({ avatarVersion: nextVersion });
    },

    async remove(userId: UserId) {
      let currentAvatar: AvatarMetaRow | null | undefined;
      try {
        currentAvatar = await repos.users.findAvatarMetaById(userId);
      } catch {
        return Err({ code: "repository_unavailable" });
      }

      if (!currentAvatar) {
        return Err({ code: "user_not_found" });
      }

      const nextVersion = currentAvatar.avatar_version + 1;

      try {
        await repos.users.clearAvatar(userId, {
          updated_at: new Date(),
          version: nextVersion,
        });
      } catch {
        return Err({ code: "repository_unavailable" });
      }

      if (currentAvatar.avatar_storage_key) {
        try {
          await blobStore.delete(currentAvatar.avatar_storage_key);
        } catch (error) {
          logger.error("avatar_cleanup_failed", {
            operation: "remove",
            userId,
            oldStorageKey: currentAvatar.avatar_storage_key,
            error,
          });
        }
      }

      return Ok({ avatarVersion: nextVersion });
    },

    async get(userId: UserId) {
      let avatar: AvatarMetaRow | null | undefined;
      try {
        avatar = await repos.users.findAvatarMetaById(userId);
      } catch {
        return Err({ code: "repository_unavailable" });
      }

      if (!avatar) {
        return Err({ code: "user_not_found" });
      }

      if (!avatar.avatar_storage_key || !avatar.avatar_mime_type) {
        return Err({ code: "avatar_not_found" });
      }

      let bytes: Uint8Array;
      try {
        bytes = await blobStore.getBytes(avatar.avatar_storage_key);
      } catch {
        return Err({ code: "storage_unavailable" });
      }

      return Ok({
        storageKey: avatar.avatar_storage_key,
        mimeType: avatar.avatar_mime_type,
        version: avatar.avatar_version,
        updatedAt: avatar.avatar_updated_at ?? new Date(0),
        bytes,
      });
    },
  };
}
