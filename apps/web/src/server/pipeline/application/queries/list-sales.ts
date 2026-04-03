import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { canViewAllSales } from "../policies/access";
import type { LeadSaleRepository } from "../ports/sale-repository";
import { parsePageParams } from "./pagination";

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
  const page = parsePageParams(input);
  if (!page.ok) {
    return page;
  }

  if (!canViewAllSales(input.actorRole)) {
    return Ok(
      await deps.leadSales.listByExecutive(
        input.actorUserId,
        page.value.limit,
        page.value.offset,
      ),
    );
  }

  return Ok(await deps.leadSales.list(page.value.limit, page.value.offset));
}
