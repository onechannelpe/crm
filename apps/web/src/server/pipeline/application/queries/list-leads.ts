import type { Role } from "~/lib/auth/access/rbac";
import { toLeadStage, toLeadStatus, toPrioridad } from "~/lib/db/types";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { createPipelineQueryDeps } from "../../infrastructure/deps";
import {
  requireLeadReadAccess,
  resolveLeadListExecutiveScope,
} from "../policies/access";

export async function listLeads(input: {
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
        ReturnType<ReturnType<typeof createPipelineQueryDeps>["leads"]["list"]>
      >;
      totalCount: number;
    },
    DomainError
  >
> {
  const canRead = requireLeadReadAccess(input.actorRole);
  if (!canRead.ok) {
    return canRead;
  }

  const deps = createPipelineQueryDeps();
  const filters = {
    executiveId: resolveLeadListExecutiveScope({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      requestedExecutiveId: input.filters.executiveId,
    }),
    stage: toLeadStage(input.filters.stage),
    status: toLeadStatus(input.filters.status),
    prioridad: toPrioridad(input.filters.prioridad),
    limit: Math.min(input.filters.limit ?? 50, 200),
    offset: input.filters.offset ?? 0,
  };

  const [rows, totalCount] = await Promise.all([
    deps.leads.list(filters),
    deps.leads.count(filters),
  ]);

  return Ok({ rows, totalCount });
}
