import type { Role } from "~/lib/auth/access/rbac";
import { pipelineRepos } from "~/server/shared/pipeline-runtime";

export function listSalesQuery(input: {
  actorRole: Role;
  actorUserId: number;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(input.limit ?? 50, 200);
  const offset = input.offset ?? 0;

  if (input.actorRole === "executive") {
    return pipelineRepos.sales.listByExecutive(
      input.actorUserId,
      limit,
      offset,
    );
  }

  return pipelineRepos.sales.list(limit, offset);
}
