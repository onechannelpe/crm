import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { checkArtifactPolicy } from "../policy";
import { assertValidTransition, isValidTransition } from "../transitions";
import type { ArtifactStatus, WorkflowArtifact } from "../types";
import { validateUploadFile } from "../validators";
import type { UploadArtifactDeps } from "./contracts";
import { actorFromCtx, buildStorageKey, emitEvent } from "./helpers";

export async function uploadArtifactFile(
  ctx: AppContext,
  artifactId: number,
  file: { name: string; bytes: Uint8Array },
  deps: UploadArtifactDeps,
): Promise<Result<WorkflowArtifact, DomainError>> {
  const actor = actorFromCtx(ctx);
  const { repo, storage } = deps;
  const now = ctx.now();

  const artifact = await repo.findArtifactById(artifactId);
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
    await repo.updateArtifactStatus(artifactId, nextStatus, now);
    currentStatus = nextStatus;
  }

  async function failArtifact(code: string, message: string): Promise<void> {
    if (!isValidTransition(currentStatus, "failed")) return;
    await repo.updateArtifactStatus(artifactId, "failed", now, {
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
      sizeBytes: file.bytes.length,
    });

    await transitionTo("validating");

    const validation = validateUploadFile(
      artifact.artifactType,
      file.name,
      file.bytes,
    );
    if (!validation.ok) {
      const message = `File validation failed: ${validation.reason}`;
      await failArtifact(validation.reason, message);
      return Err(domainError("validation", validation.reason, message));
    }

    await transitionTo("scanning");

    const storageKey = buildStorageKey(
      artifact.artifactType,
      artifactId,
      now,
      validation.extension,
    );
    const { sha256 } = await storage.put(storageKey, file.bytes);

    const fileAssetId = await repo.insertFileAsset({
      storageKey,
      originalFilename: file.name,
      safeDisplayFilename: validation.safeDisplayFilename,
      detectedMime: validation.detectedMime,
      extension: validation.extension,
      sizeBytes: file.bytes.length,
      sha256Hex: sha256,
      signatureKind: validation.signatureKind,
      scanStatus: "clean",
      now,
    });

    await repo.insertFileBinding({
      artifactId,
      fileAssetId,
      bindingRole: "source_upload",
      versionNo: 1,
      now,
    });

    await transitionTo("ready");

    await emitEvent(repo, artifactId, "artifact.ready", ctx, {
      fileAssetId,
      sha256Hex: sha256,
    });

    const updated = await repo.findArtifactById(artifactId);
    if (!updated) {
      return Err(
        domainError(
          "not_found",
          "artifact_vanished",
          "Artifact not found after update",
        ),
      );
    }

    return Ok(updated);
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
