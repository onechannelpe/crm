import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { createPipelineQueryDeps } from "../../infrastructure/deps";
import { canViewAllSales } from "../policies/access";

type QueryDeps = ReturnType<typeof createPipelineQueryDeps>;

export async function listSales(input: {
  actorRole: Role;
  actorUserId: number;
  limit?: number;
  offset?: number;
}): Promise<
  Result<Awaited<ReturnType<QueryDeps["sales"]["list"]>>, DomainError>
> {
  const deps = createPipelineQueryDeps();
  const limit = Math.min(input.limit ?? 50, 200);
  const offset = input.offset ?? 0;

  if (!canViewAllSales(input.actorRole)) {
    return Ok(
      await deps.sales.listByExecutive(input.actorUserId, limit, offset),
    );
  }

  return Ok(await deps.sales.list(limit, offset));
}
