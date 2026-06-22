import type { AppContext } from "~/server/platform/action/context";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { checkArtifactPolicy } from "../policy";
import type { ArtifactType, WorkflowArtifact } from "../types";
import type { RequestArtifactDeps, RequestArtifactInput } from "./contracts";
import { actorFromCtx, buildPolicySnapshot, emitEvent } from "./helpers";

const DIRECTION_MAP: Record<
  ArtifactType,
  "upload" | "download" | "bidirectional"
> = {
  records_export: "download",
  integration_import: "upload",
  sale_proof: "upload",
  rate_revision_file: "upload",
  transactions_report: "upload",
  addendum_unsigned: "upload",
  addendum_signed_photo: "upload",
  addendum_signed_pdf: "upload",
  payment_proof: "upload",
};

export async function requestArtifact(
  ctx: AppContext,
  input: RequestArtifactInput,
  deps: RequestArtifactDeps,
): Promise<Result<WorkflowArtifact, DomainError>> {
  const actor = actorFromCtx(ctx);
  const policyResult = checkArtifactPolicy(
    actor,
    null,
    "artifact.request",
    input.artifactType,
  );
  if (isErr(policyResult)) return policyResult;

  const { repo } = deps;
  const now = ctx.now();
  const direction = DIRECTION_MAP[input.artifactType];
  if (direction === "download") {
    return Err(fail("download_artifact_requires_generated_payload"));
  }
  const scopeBranchId =
    ctx.actor.role === "superuser" ? null : ctx.actor.branchId;

  const artifactId = await repo.artifacts.insert({
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

  const artifact = await repo.artifacts.findById(artifactId);
  if (!artifact) {
    throw new Error("Artifact not found after creation");
  }

  return Ok(artifact);
}
