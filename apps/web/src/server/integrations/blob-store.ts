import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface CrmJobBlobStore {
  put(key: string, content: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
}

export function createCrmJobBlobStore(baseDir: string): CrmJobBlobStore {
  const root = join(baseDir, "crm-jobs");

  return {
    async put(key: string, content: Uint8Array) {
      await mkdir(root, { recursive: true });
      await writeFile(join(root, key), content);
    },

    async get(key: string) {
      return readFile(join(root, key));
    },
  };
}
