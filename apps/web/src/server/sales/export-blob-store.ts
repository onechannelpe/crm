import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface SalesExportBlobStore {
  put(storageKey: string, content: Uint8Array): Promise<{ sha256: string }>;
  get(storageKey: string): Promise<Uint8Array>;
  delete(storageKey: string): Promise<void>;
}

function toSha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function createSalesExportBlobStore(
  baseDir: string,
): SalesExportBlobStore {
  const exportsRoot = join(baseDir, "sales-exports");

  return {
    async put(storageKey: string, content: Uint8Array) {
      await mkdir(exportsRoot, { recursive: true });
      const filePath = join(exportsRoot, storageKey);
      await writeFile(filePath, content);
      return { sha256: toSha256Hex(content) };
    },

    async get(storageKey: string) {
      const filePath = join(exportsRoot, storageKey);
      return readFile(filePath);
    },

    async delete(storageKey: string) {
      const filePath = join(exportsRoot, storageKey);
      await rm(filePath, { force: true });
    },
  };
}
