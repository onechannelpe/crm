import { fail, type DomainError } from "~/domain/errors";
import { Err, Ok, type Result } from "~/shared/result";

import { hashToken } from "../token";
import type { DownloadReady } from "../types";
import type { ExecuteDownloadDeps } from "./contracts";

export async function executeDownload(
  tokenRaw: string,
  deps: ExecuteDownloadDeps,
  now: Date,
): Promise<Result<DownloadReady, DomainError>> {
  const { repo, storage } = deps;
  const tokenHash = hashToken(tokenRaw);

  const tokenRow = await repo.tokens.findByHash(tokenHash);
  if (!tokenRow) {
    return Err(fail("token_not_found"));
  }

  if (tokenRow.usedAt !== null) {
    return Err(fail("token_already_used"));
  }

  if (tokenRow.expiresAt < now) {
    return Err(fail("token_expired"));
  }

  const fileAsset = await repo.assets.findById(tokenRow.fileAssetId);
  if (!fileAsset) {
    return Err(fail("file_asset_not_found"));
  }

  let bytes: Uint8Array;
  try {
    bytes = await storage.getBytes(fileAsset.storageKey);
  } catch {
    return Err(fail("file_storage_missing"));
  }

  const tokenConsumed = await repo.tokens.markUsed(tokenHash, now);
  if (!tokenConsumed) {
    return Err(fail("token_already_used"));
  }

  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return Ok({ fileAsset, body });
}
