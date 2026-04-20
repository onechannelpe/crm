import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { hashToken } from "../token";
import type { DownloadReady } from "../types";
import type { ExecuteDownloadDeps } from "./contracts";

export async function executeDownload(
  tokenRaw: string,
  deps: ExecuteDownloadDeps,
  now: number,
): Promise<Result<DownloadReady, DomainError>> {
  const { repo, storage } = deps;
  const tokenHash = hashToken(tokenRaw);

  const tokenRow = await repo.findDownloadToken(tokenHash);
  if (!tokenRow) {
    return Err(
      domainError("not_found", "token_not_found", "Download token not found"),
    );
  }

  if (tokenRow.usedAt !== null) {
    return Err(
      domainError(
        "conflict",
        "token_already_used",
        "Download token has already been used",
      ),
    );
  }

  if (tokenRow.expiresAt < now) {
    return Err(
      domainError("conflict", "token_expired", "Download token has expired"),
    );
  }

  const artifact = await repo.findArtifactById(tokenRow.artifactId);
  if (!artifact) {
    return Err(
      domainError("not_found", "artifact_not_found", "Artifact not found"),
    );
  }

  const fileAsset = await repo.findFileAssetById(tokenRow.fileAssetId);
  if (!fileAsset) {
    return Err(
      domainError("not_found", "file_asset_not_found", "File asset not found"),
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = await storage.get(fileAsset.storageKey);
  } catch {
    return Err(
      domainError(
        "not_found",
        "file_storage_missing",
        "File not found in storage",
      ),
    );
  }

  await repo.markDownloadTokenUsed(tokenHash, now);
  await repo.insertEvent({
    artifactId: artifact.id,
    eventType: "artifact.downloaded",
    actorUserId: tokenRow.requestedByUserId,
    actorRole: null,
    requestId: null,
    traceId: null,
    ipHash: null,
    userAgent: null,
    details: { fileAssetId: fileAsset.id, tokenHash },
    now,
  });

  return Ok({ artifact, fileAsset, bytes });
}
