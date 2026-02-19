import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

function toStorageKey(sha256: string) {
  return `${sha256.slice(0, 2)}/${sha256.slice(2, 4)}/${sha256}.blob`;
}

function isNodeErrorWithCode(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export function createDocumentBlobStore(rootPath: string) {
  const absoluteRoot = resolve(rootPath);

  return {
    getRootPath() {
      return absoluteRoot;
    },

    async put(bytes: Uint8Array) {
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const storageKey = toStorageKey(sha256);
      const absolutePath = join(absoluteRoot, storageKey);

      await mkdir(dirname(absolutePath), { recursive: true });

      try {
        await stat(absolutePath);
        return {
          sha256,
          storageKey,
          absolutePath,
          sizeBytes: bytes.byteLength,
        };
      } catch {
        // Continue with write path.
      }

      const tempDir = join(absoluteRoot, "tmp");
      await mkdir(tempDir, { recursive: true });
      const tempPath = join(tempDir, `${randomUUID()}.part`);

      await writeFile(tempPath, bytes, { flag: "wx" });
      try {
        await rename(tempPath, absolutePath);
      } catch (error) {
        await rm(tempPath, { force: true });
        if (!isNodeErrorWithCode(error, "EEXIST")) {
          throw error;
        }
      }

      return { sha256, storageKey, absolutePath, sizeBytes: bytes.byteLength };
    },

    async deleteByStorageKey(storageKey: string) {
      const absolutePath = join(absoluteRoot, storageKey);
      await rm(absolutePath, { force: true });
    },
  };
}

export type DocumentBlobStore = ReturnType<typeof createDocumentBlobStore>;
