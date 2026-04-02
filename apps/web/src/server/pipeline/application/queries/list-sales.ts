import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { canViewAllSales } from "../policies/access";
import type { LeadSaleRepository } from "../ports";

type ListSalesDeps = {
  leadSales: LeadSaleRepository;
};

export async function listSales(
  deps: ListSalesDeps,
  input: {
    actorRole: Role;
    actorUserId: number;
    limit?: number;
    offset?: number;
  },
): Promise<
  Result<Awaited<ReturnType<LeadSaleRepository["list"]>>, DomainError>
> {
  const limit = Math.min(input.limit ?? 50, 200);
  const offset = input.offset ?? 0;

  if (!canViewAllSales(input.actorRole)) {
    return Ok(
      await deps.leadSales.listByExecutive(input.actorUserId, limit, offset),
    );
  }

  return Ok(await deps.leadSales.list(limit, offset));
}
