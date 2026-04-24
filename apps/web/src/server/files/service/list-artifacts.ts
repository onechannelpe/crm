import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";

import { checkArtifactPolicy } from "../policy";
import type { ArtifactType, WorkflowArtifact } from "../types";
import type { ListArtifactsDeps } from "./contracts";
import { actorFromCtx } from "./helpers";

export async function listArtifacts(
  ctx: AppContext,
  filters: {
    artifactType?: ArtifactType;
    limit?: number;
    offset?: number;
  },
  deps: ListArtifactsDeps,
): Promise<Result<WorkflowArtifact[], DomainError>> {
  const actor = actorFromCtx(ctx);
  const auditResult = checkArtifactPolicy(actor, null, "artifact.audit.read");
  if (isErr(auditResult)) return auditResult;

  const scopeBranchId = actor.role === "superuser" ? undefined : actor.branchId;
  const artifacts = await deps.repo.artifacts.list({
    artifactType: filters.artifactType,
    scopeBranchId,
    limit: Math.min(filters.limit ?? 50, 200),
    offset: filters.offset ?? 0,
  });

  return Ok(artifacts);
}
