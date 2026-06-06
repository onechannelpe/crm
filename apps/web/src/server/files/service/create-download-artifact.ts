import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { checkArtifactPolicy } from "../policy";
import type { FileStorage } from "../storage";
import type { ArtifactType, ArtifactWithAsset } from "../types";
import {
  buildUploadMetadata,
  createUploadStreamInspector,
  validateUploadMetadata,
} from "../validators";
import type { RequestArtifactRepo } from "./contracts";
import {
  actorFromCtx,
  buildPolicySnapshot,
  buildStorageKey,
  emitEvent,
} from "./helpers";

export interface CreateDownloadArtifactInput {
  artifactType: ArtifactType;
  workflowContext: Record<string, unknown>;
  filename: string;
  bytes: Uint8Array;
}

export interface CreateDownloadArtifactDeps {
  repo: RequestArtifactRepo;
  storage: FileStorage;
}

export async function createDownloadArtifact(
  ctx: AppContext,
  input: CreateDownloadArtifactInput,
  deps: CreateDownloadArtifactDeps,
): Promise<Result<ArtifactWithAsset, DomainError>> {
  const actor = actorFromCtx(ctx);
  const policyResult = checkArtifactPolicy(
    actor,
    null,
    "artifact.request",
    input.artifactType,
  );
  if (isErr(policyResult)) return policyResult;

  const staticValidation = validateUploadMetadata(
    input.artifactType,
    input.filename,
  );
  if (!staticValidation.ok) {
    return Err(
      domainError(
        "validation",
        "download_payload_invalid",
        staticValidation.reason,
      ),
    );
  }

  const inspector = createUploadStreamInspector(
    input.artifactType,
    staticValidation.extension,
  );
  const streamError = inspector.pushChunk(input.bytes);
  if (streamError) {
    return Err(
      domainError("validation", "download_payload_invalid", streamError.reason),
    );
  }
  const streamValidation = inspector.finalize();
  if (!streamValidation.ok) {
    return Err(
      domainError(
        "validation",
        "download_payload_invalid",
        streamValidation.reason,
      ),
    );
  }

  const now = ctx.now();
  const scopeBranchId =
    ctx.actor.role === "superuser" ? null : ctx.actor.branchId;
  const artifactId = await deps.repo.artifacts.insert({
    artifactType: input.artifactType,
    direction: "download",
    executionMode: "sync",
    status: "requested",
    requestedByUserId: actor.userId,
    scopeBranchId,
    scopeTeamId: null,
    policySnapshotJson: buildPolicySnapshot(actor),
    workflowContextJson: JSON.stringify(input.workflowContext),
    expiresAt: null,
    now,
  });
  await emitEvent(deps.repo, artifactId, "artifact.requested", ctx, {
    artifactType: input.artifactType,
    executionMode: "sync",
  });

  const metadata = buildUploadMetadata(
    staticValidation.safeDisplayFilename,
    staticValidation.extension,
    streamValidation,
  );
  const storageKey = buildStorageKey(
    input.artifactType,
    artifactId,
    now,
    staticValidation.extension,
  );
  const stored = await deps.storage.putBytes(storageKey, input.bytes);

  const fileAssetId = await deps.repo.assets.insert({
    storageKey,
    originalFilename: input.filename,
    safeDisplayFilename: metadata.safeDisplayFilename,
    detectedMime: metadata.detectedMime,
    extension: metadata.extension,
    sizeBytes: metadata.sizeBytes,
    sha256Hex: stored.sha256,
    signatureKind: metadata.signatureKind,
    scanStatus: "clean",
    now,
  });

  await deps.repo.artifacts.insertFileBinding({
    artifactId,
    fileAssetId,
    bindingRole: "export_output",
    versionNo: 1,
    now,
  });
  await deps.repo.artifacts.updateStatus(artifactId, "ready", now);
  await emitEvent(deps.repo, artifactId, "artifact.ready", ctx, {
    fileAssetId,
    sha256Hex: stored.sha256,
  });

  const artifact = await deps.repo.artifacts.findById(artifactId);
  const fileAsset = await deps.repo.artifacts.findFileAssetForArtifact(
    artifactId,
    "export_output",
  );
  if (!artifact || !fileAsset) {
    return Err(
      domainError(
        "external",
        "artifact_create_incomplete",
        "Artifact generation completed but persisted artifact is incomplete",
      ),
    );
  }

  return Ok({ artifact, fileAsset });
}
