import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { SaleView } from "../contracts";
import type { SaleQueryDeps } from "../deps/lead-queries";
import { canViewAllSales } from "../policies/access";
import { parsePageParams } from "./pagination";

export async function listSales(
  deps: SaleQueryDeps,
  input: {
    actorRole: Role;
    actorUserId: number;
    limit?: number;
    offset?: number;
  },
): Promise<Result<SaleView[], DomainError>> {
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
