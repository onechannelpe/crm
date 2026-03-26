import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { toLeadStage, toLeadStatus, toPrioridad } from "~/lib/db/types";
import { pipelineRepos } from "~/server/shared/pipeline-runtime";

export async function listLeadsQuery(input: {
  actorRole: Role;
  actorUserId: number;
  stage?: string;
  status?: string;
  prioridad?: string;
  fromDate?: number;
  toDate?: number;
  executiveId?: number;
  limit?: number;
  offset?: number;
}) {
  const canViewAll = hasPermission(input.actorRole, "lead:view:all");
  return pipelineRepos.leads.list({
    executiveId: canViewAll ? input.executiveId : input.actorUserId,
    stage: toLeadStage(input.stage),
    status: toLeadStatus(input.status),
    prioridad: toPrioridad(input.prioridad),
    fromDate: input.fromDate,
    toDate: input.toDate,
    limit: Math.min(input.limit ?? 50, 200),
    offset: input.offset ?? 0,
  });
}
