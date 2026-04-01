import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createPipelineQueryDeps } from "../../infrastructure/deps";
import { canViewAllSales } from "../policies/access";

type QueryDeps = ReturnType<typeof createPipelineQueryDeps>;

export async function getSaleDetailWithDeps(
  deps: QueryDeps,
  input: {
    actorRole: Role;
    actorUserId: number;
    saleId: number;
  },
): Promise<
  Result<
    NonNullable<Awaited<ReturnType<QueryDeps["sales"]["findById"]>>>,
    DomainError
  >
> {
  const sale = await deps.sales.findById(input.saleId);
  if (!sale) {
    return Err(domainError("not_found", "sale_not_found", "Sale not found"));
  }

  if (
    !canViewAllSales(input.actorRole) &&
    sale.executive_id !== input.actorUserId
  ) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return Ok(sale);
}

export async function getSaleDetail(input: {
  actorRole: Role;
  actorUserId: number;
  saleId: number;
}): Promise<
  Result<
    NonNullable<Awaited<ReturnType<QueryDeps["sales"]["findById"]>>>,
    DomainError
  >
> {
  const deps = createPipelineQueryDeps();
  return getSaleDetailWithDeps(deps, input);
}
