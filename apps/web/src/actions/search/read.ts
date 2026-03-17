"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import { searchAllowanceService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export async function getMySearchAllowance() {
  const session = await requirePermission("capacity:read:self");
  const result = await searchAllowanceService.getCurrentSearchAllowance(
    session.userId,
  );
  if (isErr(result)) {
    throwDomainError(result.error);
  }
  return result.value;
}
