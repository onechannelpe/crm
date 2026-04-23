import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { checkArtifactPolicy } from "../policy";
import type { ArtifactWithAsset } from "../types";
import type { GetArtifactDeps } from "./contracts";
import { actorFromCtx } from "./helpers";

export async function getArtifact(
  ctx: AppContext,
  artifactId: string,
  deps: GetArtifactDeps,
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
