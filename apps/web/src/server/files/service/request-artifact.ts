import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { checkArtifactPolicy } from "../policy";
import type { FileStorage } from "../storage";
import { assertValidTransition } from "../transitions";
import type { ArtifactType, ArtifactWithAsset } from "../types";
import {
  buildUploadMetadata,
  createUploadStreamInspector,
  validateUploadMetadata,
} from "../validators";
import type {
  RequestArtifactDeps,
  RequestArtifactInput,
  RequestArtifactRepo,
  SyncExecutor,
} from "./contracts";
import {
  actorFromCtx,
  buildPolicySnapshot,
  buildStorageKey,
  emitEvent,
} from "./helpers";

const DIRECTION_MAP: Record<
  ArtifactType,
  "upload" | "download" | "bidirectional"
> = {
  leads_export: "download",
  integration_import: "upload",
};

async function runSyncExport(
  ctx: AppContext,
  artifactId: number,
  artifactType: ArtifactType,
  workflowContext: Record<string, unknown>,
  repo: RequestArtifactRepo,
  storage: FileStorage,
  syncExecutor: SyncExecutor,
): Promise<Result<void, DomainError>> {
  const now = ctx.now();
  assertValidTransition("requested", "ready");

  let result: { bytes: Uint8Array; filename: string };
  try {
    result = await syncExecutor.run(artifactType, workflowContext);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Export failed";
    return Err(domainError("unexpected", "sync_executor_failed", msg));
  }

  const bytes = result.bytes;
  const staticValidation = validateUploadMetadata(
    artifactType,
    result.filename,
  );
  if (!staticValidation.ok) {
    return Err(
      domainError(
        "unexpected",
        "sync_executor_invalid_output",
        `Sync executor output failed validation: ${staticValidation.reason}`,
      ),
    );
  }
  const inspector = createUploadStreamInspector(
    artifactType,
    staticValidation.extension,
  );
  const streamError = inspector.pushChunk(bytes);
  if (streamError) {
    return Err(
      domainError(
        "unexpected",
        "sync_executor_invalid_output",
        `Sync executor output failed validation: ${streamError.reason}`,
      ),
    );
  }
  const streamValidation = inspector.finalize();
  if (!streamValidation.ok) {
    return Err(
      domainError(
        "unexpected",
        "sync_executor_invalid_output",
        `Sync executor output failed validation: ${streamValidation.reason}`,
      ),
    );
  }
  const metadata = buildUploadMetadata(
    staticValidation.safeDisplayFilename,
    staticValidation.extension,
    streamValidation,
  );

  const storageKey = buildStorageKey(
    artifactType,
    artifactId,
    now,
    staticValidation.extension,
  );
  const stored = await storage.putBytes(storageKey, bytes);

  const fileAssetId = await repo.insertFileAsset({
    storageKey,
    originalFilename: result.filename,
    safeDisplayFilename: metadata.safeDisplayFilename,
    detectedMime: metadata.detectedMime,
    extension: metadata.extension,
    sizeBytes: metadata.sizeBytes,
    sha256Hex: stored.sha256,
    signatureKind: metadata.signatureKind,
    scanStatus: "clean",
    now,
  });

  await repo.insertFileBinding({
    artifactId,
    fileAssetId,
    bindingRole: "export_output",
    versionNo: 1,
    now,
  });

  await repo.updateArtifactStatus(artifactId, "ready", now);
  await emitEvent(repo, artifactId, "artifact.ready", ctx, {
    fileAssetId,
    sha256Hex: stored.sha256,
  });

  return Ok(undefined);
}

export async function requestArtifact(
  ctx: AppContext,
  input: RequestArtifactInput,
  deps: RequestArtifactDeps,
): Promise<Result<ArtifactWithAsset, DomainError>> {
  const actor = actorFromCtx(ctx);
  const policyResult = checkArtifactPolicy(actor, null, "artifact.request");
  if (isErr(policyResult)) return policyResult;

  const { repo, storage, syncExecutor } = deps;
  const now = ctx.now();
  const direction = DIRECTION_MAP[input.artifactType];
  const scopeBranchId =
    ctx.actor.role === "superuser" ? null : ctx.actor.branchId;

  const artifactId = await repo.insertArtifact({
    artifactType: input.artifactType,
    direction,
    executionMode: input.executionMode,
    status: "requested",
    requestedByUserId: actor.userId,
    scopeBranchId,
    scopeTeamId: null,
    policySnapshotJson: buildPolicySnapshot(actor),
    workflowContextJson: JSON.stringify(input.workflowContext),
    expiresAt: null,
    now,
  });

  await emitEvent(repo, artifactId, "artifact.requested", ctx, {
    artifactType: input.artifactType,
    executionMode: input.executionMode,
  });

  if (input.executionMode === "sync" && direction === "download") {
    const syncResult = await runSyncExport(
      ctx,
      artifactId,
      input.artifactType,
      input.workflowContext,
      repo,
      storage,
      syncExecutor,
    );
    if (isErr(syncResult)) {
      await repo.updateArtifactStatus(artifactId, "failed", ctx.now(), {
        code: syncResult.error.code,
        message: syncResult.error.message,
      });
      await emitEvent(repo, artifactId, "artifact.failed", ctx, {
        errorCode: syncResult.error.code,
        errorMessage: syncResult.error.message,
      });
      return syncResult;
    }
  }

  const artifact = await repo.findArtifactById(artifactId);
  if (!artifact) {
    return Err(
      domainError(
        "unexpected",
        "artifact_missing_after_insert",
        "Artifact not found after creation",
      ),
    );
  }

  const fileAsset =
    direction === "download"
      ? await repo.findFileAssetForArtifact(artifactId, "export_output")
      : null;

  return Ok({ artifact, fileAsset });
}
