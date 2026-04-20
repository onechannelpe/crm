import { createHash } from "node:crypto";
import { TextEncoder } from "node:util";

import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import {
  checkArtifactPolicy,
  checkDownloadPolicy,
  type PolicyActor,
} from "./policy";
import type { ArtifactRepo } from "./repo";
import type { FileStorage } from "./storage";
import {
  generateDownloadToken,
  hashToken,
  DOWNLOAD_TOKEN_TTL_MS,
} from "./token";
import { assertValidTransition } from "./transitions";
import type {
  ArtifactExecutionMode,
  ArtifactType,
  ArtifactWithAsset,
  DownloadReady,
  WorkflowArtifact,
} from "./types";
import { validateUploadFile } from "./validators";

export interface SyncExecutor {
  run(
    artifactType: ArtifactType,
    context: Record<string, unknown>,
  ): Promise<{
    bytes: Uint8Array;
    filename: string;
  }>;
}

export interface ArtifactServiceDeps {
  repo: ArtifactRepo;
  storage: FileStorage;
  syncExecutor: SyncExecutor;
}

function actorFromCtx(ctx: AppContext): PolicyActor {
  return {
    userId: ctx.actor.userId,
    role: ctx.actor.role,
    branchId: ctx.actor.branchId,
  };
}

function buildPolicySnapshot(actor: PolicyActor): string {
  return JSON.stringify({
    userId: actor.userId,
    role: actor.role,
    branchId: actor.branchId,
  });
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

async function emitEvent(
  repo: ArtifactRepo,
  artifactId: number,
  eventType: string,
  ctx: AppContext,
  details: Record<string, unknown> = {},
): Promise<void> {
  await repo.insertEvent({
    artifactId,
    eventType,
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    requestId: ctx.requestId,
    traceId: ctx.traceId,
    ipHash: hashIp(ctx.ipAddress),
    userAgent: ctx.userAgent ?? null,
    details,
    now: ctx.now(),
  });
}

export interface RequestArtifactInput {
  artifactType: ArtifactType;
  executionMode: ArtifactExecutionMode;
  workflowContext: Record<string, unknown>;
}

export async function requestArtifact(
  ctx: AppContext,
  input: RequestArtifactInput,
  deps: ArtifactServiceDeps,
): Promise<Result<ArtifactWithAsset, DomainError>> {
  const actor = actorFromCtx(ctx);

  const policyResult = checkArtifactPolicy(actor, null, "artifact.request");
  if (isErr(policyResult)) return policyResult;

  const { repo, storage, syncExecutor } = deps;
  const now = ctx.now();

  const DIRECTION_MAP: Record<
    ArtifactType,
    "upload" | "download" | "bidirectional"
  > = {
    leads_export: "download",
    integration_import: "upload",
    sales_export: "download",
  };

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

async function runSyncExport(
  ctx: AppContext,
  artifactId: number,
  artifactType: ArtifactType,
  workflowContext: Record<string, unknown>,
  repo: ArtifactRepo,
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

  const enc = new TextEncoder();
  const bytes =
    result.bytes instanceof Uint8Array
      ? result.bytes
      : enc.encode(String(result.bytes));

  const storageKey = `${artifactType}-${artifactId}-${now}.csv`;
  const { sha256 } = await storage.put(storageKey, bytes);

  const fileAssetId = await repo.insertFileAsset({
    storageKey,
    originalFilename: result.filename,
    safeDisplayFilename: result.filename,
    detectedMime: "text/csv; charset=utf-8",
    extension: "csv",
    sizeBytes: bytes.length,
    sha256Hex: sha256,
    signatureKind: "csv",
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
    sha256Hex: sha256,
  });

  return Ok(undefined);
}

export async function uploadArtifactFile(
  ctx: AppContext,
  artifactId: number,
  file: { name: string; bytes: Uint8Array },
  deps: ArtifactServiceDeps,
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

  assertValidTransition("requested", "receiving");
  await repo.updateArtifactStatus(artifactId, "receiving", now);
  await emitEvent(repo, artifactId, "artifact.receiving", ctx, {
    originalFilename: file.name,
    sizeBytes: file.bytes.length,
  });

  assertValidTransition("receiving", "validating");
  await repo.updateArtifactStatus(artifactId, "validating", now);

  const validation = validateUploadFile(
    artifact.artifactType,
    file.name,
    file.bytes,
  );
  if (!validation.ok) {
    await repo.updateArtifactStatus(artifactId, "failed", ctx.now(), {
      code: validation.reason,
      message: `File validation failed: ${validation.reason}`,
    });
    await emitEvent(repo, artifactId, "artifact.failed", ctx, {
      reason: validation.reason,
    });
    return Err(
      domainError(
        "validation",
        validation.reason,
        `File validation failed: ${validation.reason}`,
      ),
    );
  }

  assertValidTransition("validating", "scanning");
  await repo.updateArtifactStatus(artifactId, "scanning", ctx.now());

  const storageKey = `${artifact.artifactType}-${artifactId}-${now}${validation.extension ? `.${validation.extension}` : ""}`;
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

  assertValidTransition("scanning", "ready");
  await repo.updateArtifactStatus(artifactId, "ready", ctx.now());

  await emitEvent(repo, artifactId, "artifact.ready", ctx, {
    fileAssetId,
    sha256Hex: sha256,
  });

  const updated = await repo.findArtifactById(artifactId);
  return Ok(updated!);
}

export async function requestDownloadToken(
  ctx: AppContext,
  artifactId: number,
  deps: ArtifactServiceDeps,
): Promise<Result<{ token: string }, DomainError>> {
  const actor = actorFromCtx(ctx);
  const { repo } = deps;
  const now = ctx.now();

  const artifact = await repo.findArtifactById(artifactId);
  if (!artifact) {
    return Err(
      domainError("not_found", "artifact_not_found", "Artifact not found"),
    );
  }

  const policyResult = checkDownloadPolicy(actor, artifact);
  if (isErr(policyResult)) return policyResult;

  const bindingRole =
    artifact.direction === "upload" ? "source_upload" : "export_output";
  const fileAsset = await repo.findFileAssetForArtifact(
    artifactId,
    bindingRole,
  );
  if (!fileAsset) {
    return Err(
      domainError(
        "not_found",
        "artifact_file_not_found",
        "File not found for this artifact",
      ),
    );
  }

  const rawToken = generateDownloadToken();
  const tokenHash = hashToken(rawToken);

  await repo.insertDownloadToken({
    artifactId,
    fileAssetId: fileAsset.id,
    tokenHash,
    requestedByUserId: actor.userId,
    expiresAt: now + DOWNLOAD_TOKEN_TTL_MS,
    now,
  });

  await emitEvent(repo, artifactId, "artifact.download_token_issued", ctx, {
    fileAssetId: fileAsset.id,
    expiresAt: now + DOWNLOAD_TOKEN_TTL_MS,
  });

  return Ok({ token: rawToken });
}

export async function executeDownload(
  tokenRaw: string,
  deps: ArtifactServiceDeps,
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

export async function getArtifact(
  ctx: AppContext,
  artifactId: number,
  deps: ArtifactServiceDeps,
): Promise<Result<ArtifactWithAsset, DomainError>> {
  const actor = actorFromCtx(ctx);
  const { repo } = deps;

  const artifact = await repo.findArtifactById(artifactId);
  if (!artifact) {
    return Err(
      domainError("not_found", "artifact_not_found", "Artifact not found"),
    );
  }

  const policyResult = checkArtifactPolicy(actor, artifact, "artifact.read");
  if (isErr(policyResult)) return policyResult;

  const bindingRole =
    artifact.direction === "upload" ? "source_upload" : "export_output";
  const fileAsset = await repo.findFileAssetForArtifact(
    artifactId,
    bindingRole,
  );

  return Ok({ artifact, fileAsset });
}

export async function listArtifacts(
  ctx: AppContext,
  filters: {
    artifactType?: ArtifactType;
    limit?: number;
    offset?: number;
  },
  deps: ArtifactServiceDeps,
): Promise<Result<WorkflowArtifact[], DomainError>> {
  const actor = actorFromCtx(ctx);

  const auditResult = checkArtifactPolicy(actor, null, "artifact.audit.read");
  if (isErr(auditResult)) return auditResult;

  const scopeBranchId = actor.role === "superuser" ? undefined : actor.branchId;

  const artifacts = await deps.repo.listArtifacts({
    artifactType: filters.artifactType,
    scopeBranchId,
    limit: Math.min(filters.limit ?? 50, 200),
    offset: filters.offset ?? 0,
  });

  return Ok(artifacts);
}
