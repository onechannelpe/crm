import { join } from "node:path";

import {
  createBlobStore,
  type BlobStore,
} from "~/server/platform/files/blob-store";

export type FileStorage = BlobStore;

const WORKFLOW_FILES_DIR = "workflow-files";

export function createFileStorage(baseDir: string): FileStorage {
  return createBlobStore(join(baseDir, WORKFLOW_FILES_DIR));
}

export function readStoredFile(
  baseDir: string,
  key: string,
): Promise<Uint8Array> {
  return createFileStorage(baseDir).getBytes(key);
}
