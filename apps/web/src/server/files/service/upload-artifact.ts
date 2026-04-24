import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { checkArtifactPolicy } from "../policy";
import { assertValidTransition, isValidTransition } from "../transitions";
import type { ArtifactStatus, WorkflowArtifact } from "../types";
import {
  buildUploadMetadata,
  createUploadStreamInspector,
  validateUploadMetadata,
} from "../validators";
import type { UploadArtifactDeps, UploadArtifactInput } from "./contracts";
import { actorFromCtx, buildStorageKey, emitEvent } from "./helpers";

class UploadValidationError extends Error {
  constructor(readonly reason: string) {
    super(`upload_validation_${reason}`);
  }
}

export async function uploadArtifactFile(
  ctx: AppContext,
  artifactId: string,
  file: UploadArtifactInput,
  deps: UploadArtifactDeps,
): Promise<Result<WorkflowArtifact, DomainError>> {
  const actor = actorFromCtx(ctx);
  const { repo, storage } = deps;
  const now = ctx.now();

  const artifact = await repo.artifacts.findById(artifactId);
  if (!artifact) {
    return Err(
      domainError("not_found", "artifact_not_found", "Artifact not found"),
    );
  }

  const policyResult = checkArtifactPolicy(actor, artifact, "artifact.upload");
  if (isErr(policyResult)) return policyResult;

  let currentStatus: ArtifactStatus = artifact.status;

  async function transitionTo(nextStatus: ArtifactStatus): Promise<void> {
    assertValidTransition(currentStatus, nextStatus);
    await repo.artifacts.updateStatus(artifactId, nextStatus, now);
    currentStatus = nextStatus;
  }

  async function failArtifact(code: string, message: string): Promise<void> {
    if (!isValidTransition(currentStatus, "failed")) return;
    await repo.artifacts.updateStatus(artifactId, "failed", now, {
      code,
      message,
    });
    await emitEvent(repo, artifactId, "artifact.failed", ctx, {
      reason: code,
      message,
    });
  }

  try {
    await transitionTo("receiving");
    await emitEvent(repo, artifactId, "artifact.receiving", ctx, {
      originalFilename: file.name,
      sizeBytes: file.sizeBytes ?? null,
    });

    await transitionTo("validating");

    const staticValidation = validateUploadMetadata(
      artifact.artifactType,
      file.name,
    );
    if (!staticValidation.ok) {
      const message = `File validation failed: ${staticValidation.reason}`;
      await failArtifact(staticValidation.reason, message);
      return Err(domainError("validation", staticValidation.reason, message));
    }

    await transitionTo("scanning");

    const storageKey = buildStorageKey(
      artifact.artifactType,
      artifactId,
      now,
      staticValidation.extension,
    );
    const inspector = createUploadStreamInspector(
      artifact.artifactType,
      staticValidation.extension,
    );
    try {
      const storageResult = await storage.putFromWebStream({
        key: storageKey,
        stream: file.stream,
        onChunk: (chunk) => {
          const validationError = inspector.pushChunk(chunk);
          if (validationError) {
            throw new UploadValidationError(validationError.reason);
          }
        },
      });

      const streamValidation = inspector.finalize();
      if (!streamValidation.ok) {
        await storage.delete(storageKey);
        const message = `File validation failed: ${streamValidation.reason}`;
        await failArtifact(streamValidation.reason, message);
        return Err(domainError("validation", streamValidation.reason, message));
      }

      const metadata = buildUploadMetadata(
        staticValidation.safeDisplayFilename,
        staticValidation.extension,
        streamValidation,
      );

      const fileAssetId = await repo.assets.insert({
        storageKey,
        originalFilename: file.name,
        safeDisplayFilename: metadata.safeDisplayFilename,
        detectedMime: metadata.detectedMime,
        extension: metadata.extension,
        sizeBytes: metadata.sizeBytes,
        sha256Hex: storageResult.sha256,
        signatureKind: metadata.signatureKind,
        scanStatus: "clean",
        now,
      });

      await repo.artifacts.insertFileBinding({
        artifactId,
        fileAssetId,
        bindingRole: "source_upload",
        versionNo: 1,
        now,
      });

      await transitionTo("ready");

      await emitEvent(repo, artifactId, "artifact.ready", ctx, {
        fileAssetId,
        sha256Hex: storageResult.sha256,
      });

      return Ok({
        ...artifact,
        status: currentStatus,
        errorCode: null,
        errorMessage: null,
        updatedAt: now,
      });
    } catch (err) {
      if (err instanceof UploadValidationError) {
        const message = `File validation failed: ${err.reason}`;
        await failArtifact(err.reason, message);
        return Err(domainError("validation", err.reason, message));
      }
      throw err;
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected upload error";
    const code = "artifact_upload_unexpected_error";

    try {
      await failArtifact(code, message);
    } catch {
      // best effort: keep original error as the returned failure.
    }

    return Err(domainError("unexpected", code, message));
  }
}
