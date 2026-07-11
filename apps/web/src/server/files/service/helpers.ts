import { randomUUID } from "node:crypto";

import type { FileAssetId } from "~/server/shared/ids";

import type { FilePurpose } from "../types";

export function buildStorageKey(input: {
  purpose: FilePurpose;
  fileAssetId?: FileAssetId;
  now: Date;
  extension: string;
}): string {
  const uniqueSuffix = randomUUID().replaceAll("-", "").slice(0, 20);
  const owner = input.fileAssetId ?? uniqueSuffix;
  return `${input.purpose}/${input.now.getTime()}-${owner}.${input.extension}`;
}
