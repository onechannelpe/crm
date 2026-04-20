import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface FileStorage {
  put(key: string, content: Uint8Array): Promise<{ sha256: string }>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

export function createFileStorage(baseDir: string): FileStorage {
  const root = join(baseDir, "workflow-files");

  return {
    async put(key, content) {
      await mkdir(root, { recursive: true });
      await writeFile(join(root, key), content);
      return {
        sha256: createHash("sha256").update(content).digest("hex"),
      };
    },

    async get(key) {
      return readFile(join(root, key));
    },

    async delete(key) {
      await rm(join(root, key), { force: true });
    },
  };
}
