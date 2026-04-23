import type { Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { SaleQueryDeps } from "../deps/lead-queries";
import { canViewAllSales } from "../policies/access";
import type { SaleView } from "./views/sale";

export async function getSaleDetail(
  deps: SaleQueryDeps,
  input: {
    actorRole: Role;
    actorUserId: number;
    saleId: string;
  },
): Promise<Result<SaleView, DomainError>> {
  const sale = await deps.leadSales.findById(input.saleId);
  if (!sale) {
    return Err(domainError("not_found", "sale_not_found", "Sale not found"));
  }

  if (
    !canViewAllSales(input.actorRole) &&
    sale.executiveId !== input.actorUserId
  ) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return Ok(sale);
}
