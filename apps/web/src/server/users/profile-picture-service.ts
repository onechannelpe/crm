import type { Repositories } from "~/server/shared/registry";

import type { ProfilePictureBlobStore } from "./profile-picture-blob-store";

const MAX_PROFILE_PICTURE_BYTES = 10 * 1024 * 1024;
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
};

function assertValidProfilePictureFile(file: File): void {
  if (file.size <= 0) {
    throw new Error("Profile picture is empty");
  }
  if (file.size > MAX_PROFILE_PICTURE_BYTES) {
    throw new Error("Profile picture exceeds 10MB limit");
  }
  if (!(file.type in MIME_TO_EXTENSION)) {
    throw new Error("Unsupported profile picture format");
  }
}

export interface ProfilePictureService {
  upload(userId: number, file: File): Promise<{ avatarVersion: number }>;
  remove(userId: number): Promise<{ avatarVersion: number }>;
}

export function createProfilePictureService(
  repos: Pick<Repositories, "users">,
  blobStore: ProfilePictureBlobStore,
): ProfilePictureService {
  return {
    async upload(userId: number, file: File) {
      assertValidProfilePictureFile(file);

      const currentAvatar = await repos.users.findAvatarMetaById(userId);
      if (!currentAvatar) {
        throw new Error("User not found");
      }

      const extension = MIME_TO_EXTENSION[file.type];
      if (!extension) {
        throw new Error("Unsupported profile picture format");
      }

      const storageKey = `${userId}/${crypto.randomUUID()}.${extension}`;
      const content = new Uint8Array(await file.arrayBuffer());
      const nextVersion = currentAvatar.avatar_version + 1;
      const updatedAt = Date.now();

      await blobStore.put(storageKey, content);

      try {
        await repos.users.updateAvatar(userId, {
          storage_key: storageKey,
          mime_type: file.type,
          updated_at: updatedAt,
          version: nextVersion,
        });
      } catch (error) {
        await blobStore.delete(storageKey);
        throw error;
      }

      if (currentAvatar.avatar_storage_key) {
        await blobStore.delete(currentAvatar.avatar_storage_key);
      }

      return { avatarVersion: nextVersion };
    },

    async remove(userId: number) {
      const currentAvatar = await repos.users.findAvatarMetaById(userId);
      if (!currentAvatar) {
        throw new Error("User not found");
      }

      const nextVersion = currentAvatar.avatar_version + 1;

      await repos.users.clearAvatar(userId, {
        updated_at: Date.now(),
        version: nextVersion,
      });

      if (currentAvatar.avatar_storage_key) {
        await blobStore.delete(currentAvatar.avatar_storage_key);
      }

      return { avatarVersion: nextVersion };
    },
  };
}
