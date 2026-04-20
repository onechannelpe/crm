import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, type Result } from "~/server/shared/result";

import { checkArtifactPolicy } from "../policy";
import { assertValidTransition } from "../transitions";
import type { WorkflowArtifact } from "../types";
import { validateUploadFile } from "../validators";
import type { UploadArtifactDeps } from "./contracts";
import { actorFromCtx, emitEvent } from "./helpers";

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
  if (!updated) {
    return Err(
      domainError(
        "not_found",
        "artifact_vanished",
        "Artifact not found after update",
      ),
    );
  }

  return { ok: true, value: updated };
}
