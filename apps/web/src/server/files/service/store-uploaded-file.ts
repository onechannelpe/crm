import { fail, invalid, type DomainError } from "~/domain/errors";
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
  StoreUploadInput,
} from "./contracts";
import { buildStorageKey } from "./helpers";

class UploadValidationError extends Error {
  constructor(readonly reason: string) {
    super(`upload_validation_${reason}`);
  }
}

export async function storeUploadedFile(
  ctx: FileOperationContext,
  input: StoreUploadInput,
  deps: StoreFileDeps,
): Promise<Result<FileAsset, DomainError>> {
  const now = ctx.operationAt;
  const staticValidation = validateUploadMetadata(input.purpose, input.name);
  if (!staticValidation.ok) {
    return Err(invalid({ code: staticValidation.reason }));
  }

  const storageKey = buildStorageKey({
    purpose: input.purpose,
    storedAt: now,
    extension: staticValidation.extension,
  });
  const inspector = createUploadStreamInspector(
    input.purpose,
    staticValidation.extension,
  );

  try {
    const stored = await deps.storage.putFromWebStream({
      key: storageKey,
      stream: input.stream,
      onChunk: (chunk) => {
        const validationError = inspector.pushChunk(chunk);
        if (validationError) {
          throw new UploadValidationError(validationError.reason);
        }
      },
    });

    const streamValidation = inspector.finalize();
    if (!streamValidation.ok) {
      await deps.storage.delete(storageKey);
      return Err(invalid({ code: streamValidation.reason }));
    }

    const metadata = buildUploadMetadata(
      staticValidation.safeDisplayFilename,
      staticValidation.extension,
      streamValidation,
    );

    const fileAssetId = await deps.repo.assets.insert({
      storageKey,
      purpose: input.purpose,
      originalFilename: input.name,
      safeDisplayFilename: metadata.safeDisplayFilename,
      detectedMime: metadata.detectedMime,
      extension: metadata.extension,
      sizeBytes: metadata.sizeBytes,
      sha256Hex: stored.sha256,
      signatureKind: metadata.signatureKind,
      scanStatus: "clean",
      createdByUserId: ctx.actor.userId,
      createdAt: now,
    });

    const fileAsset = await deps.repo.assets.findById(fileAssetId);
    if (!fileAsset) {
      return Err(fail("file_asset_not_found"));
    }

    return Ok(fileAsset);
  } catch (error) {
    if (error instanceof UploadValidationError) {
      await deps.storage.delete(storageKey);
      return Err(invalid({ code: error.reason }));
    }
    throw error;
  }
}
