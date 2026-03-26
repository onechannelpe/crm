import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import type { SaleRow } from "~/server/sales/infrastructure/sale-repo";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { pipelineRepos } from "~/server/shared/pipeline-runtime";
import { type Result, Err, Ok } from "~/server/shared/result";

export async function getSaleDetailQuery(input: {
  saleId: number;
  actorUserId: number;
  actorRole: Role;
}): Promise<Result<SaleRow, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:register")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const sale = await pipelineRepos.sales.findById(input.saleId);
  if (!sale) {
    return Err(domainError("not_found", "sale_not_found", "Sale not found"));
  }

  const canViewAll =
    input.actorRole !== "executive" &&
    hasPermission(input.actorRole, "lead:register");

  if (!canViewAll && sale.executive_id !== input.actorUserId) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return Ok(sale);
}
