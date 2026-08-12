import { randomUUID } from "node:crypto";

import type { FileAssetId } from "~/domain/ids";

import type { FilePurpose } from "../types";

export function buildStorageKey(input: {
  purpose: FilePurpose;
  fileAssetId?: FileAssetId;
  storedAt: Date;
  extension: string;
}): string {
  const uniqueSuffix = randomUUID().replaceAll("-", "").slice(0, 20);
  const owner = input.fileAssetId ?? uniqueSuffix;
  return `${input.purpose}/${input.storedAt.getTime()}-${owner}.${input.extension}`;
}
