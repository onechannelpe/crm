import { fail, type DomainError } from "~/domain/errors";
import { Err, Ok, type Result } from "~/shared/result";

import type { FileAsset } from "../types";
import {
  buildUploadMetadata,
  createUploadStreamInspector,
  validateUploadMetadata,
} from "../validators";
import type {
  FileOperationContext,
  StoreFileDeps,
  StoreGeneratedFileInput,
} from "./contracts";
import { buildStorageKey } from "./helpers";

export async function storeGeneratedFile(
  ctx: FileOperationContext,
  input: StoreGeneratedFileInput,
  deps: StoreFileDeps,
): Promise<Result<FileAsset, DomainError>> {
  const staticValidation = validateUploadMetadata(
    input.purpose,
    input.filename,
  );
  if (!staticValidation.ok) {
    return Err(
      fail("download_payload_invalid", {
        details: { reason: staticValidation.reason },
      }),
    );
  }

  const inspector = createUploadStreamInspector(
    input.purpose,
    staticValidation.extension,
  );
  const streamError = inspector.pushChunk(input.bytes);
  if (streamError) {
    return Err(
      fail("download_payload_invalid", {
        details: { reason: streamError.reason },
      }),
    );
  }
  const streamValidation = inspector.finalize();
  if (!streamValidation.ok) {
    return Err(
      fail("download_payload_invalid", {
        details: { reason: streamValidation.reason },
      }),
    );
  }

  const now = ctx.now();
  const metadata = buildUploadMetadata(
    staticValidation.safeDisplayFilename,
    staticValidation.extension,
    streamValidation,
  );
  const storageKey = buildStorageKey({
    purpose: input.purpose,
    now,
    extension: staticValidation.extension,
  });
  const stored = await deps.storage.putBytes(storageKey, input.bytes);

  const fileAssetId = await deps.repo.assets.insert({
    storageKey,
    purpose: input.purpose,
    originalFilename: input.filename,
    safeDisplayFilename: metadata.safeDisplayFilename,
    detectedMime: metadata.detectedMime,
    extension: metadata.extension,
    sizeBytes: metadata.sizeBytes,
    sha256Hex: stored.sha256,
    signatureKind: metadata.signatureKind,
    scanStatus: "clean",
    createdByUserId: ctx.actor.userId,
    now,
  });

  const fileAsset = await deps.repo.assets.findById(fileAssetId);
  if (!fileAsset) {
    return Err(fail("file_asset_not_found"));
  }

  return Ok(fileAsset);
}
