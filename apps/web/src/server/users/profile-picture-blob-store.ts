import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface ProfilePictureBlobStore {
  put(storageKey: string, content: Uint8Array): Promise<void>;
  get(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
}

export function createProfilePictureBlobStore(
  baseDir: string,
): ProfilePictureBlobStore {
  const picturesRoot = join(baseDir, "profile-pictures");

  return {
    async put(storageKey: string, content: Uint8Array) {
      const filePath = join(picturesRoot, storageKey);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, content);
    },

    async get(storageKey: string) {
      const filePath = join(picturesRoot, storageKey);
      return readFile(filePath);
    },

    async delete(storageKey: string) {
      const filePath = join(picturesRoot, storageKey);
      await rm(filePath, { force: true });
    },
  };
}
