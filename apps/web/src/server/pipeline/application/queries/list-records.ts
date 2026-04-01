import type { Role } from "~/lib/auth/access/rbac";
import { toLeadStage, toLeadStatus, toPrioridad } from "~/lib/db/types";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { createPipelineQueryDeps } from "../../infrastructure/deps";
import { canViewAllRecords } from "../policies/access";

export async function listRecords(input: {
  actorUserId: number;
  actorRole: Role;
  filters: {
    stage?: string;
    status?: string;
    prioridad?: string;
    executiveId?: number;
    limit?: number;
    offset?: number;
  };
}): Promise<
  Result<
    {
      rows: Awaited<
        ReturnType<
          ReturnType<typeof createPipelineQueryDeps>["records"]["list"]
        >
      >;
      totalCount: number;
    },
    DomainError
  >
> {
  const deps = createPipelineQueryDeps();
  const filters = {
    executiveId: canViewAllRecords(input.actorRole)
      ? input.filters.executiveId
      : input.actorUserId,
    stage: toLeadStage(input.filters.stage),
    status: toLeadStatus(input.filters.status),
    prioridad: toPrioridad(input.filters.prioridad),
    limit: Math.min(input.filters.limit ?? 50, 200),
    offset: input.filters.offset ?? 0,
  };

  const [rows, totalCount] = await Promise.all([
    deps.records.list(filters),
    deps.records.count(filters),
  ]);

  return Ok({ rows, totalCount });
}
