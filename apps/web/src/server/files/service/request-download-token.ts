import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { checkArtifactPolicy } from "../policy";
import {
  generateDownloadToken,
  hashToken,
  DOWNLOAD_TOKEN_TTL_MS,
} from "../token";
import type { DownloadTokenDeps } from "./contracts";
import { actorFromCtx, DOWNLOAD_READY_STATUSES, emitEvent } from "./helpers";

export async function requestDownloadToken(
  ctx: AppContext,
  artifactId: string,
  deps: DownloadTokenDeps,
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

  const policyResult = checkArtifactPolicy(actor, artifact, "artifact.read");
  if (isErr(policyResult)) return policyResult;

  if (!DOWNLOAD_READY_STATUSES.has(artifact.status)) {
    return Err(
      domainError(
        "conflict",
        "artifact_not_downloadable",
        "Artifact file is not ready",
      ),
    );
  }

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
