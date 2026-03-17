"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import { leadRefillService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export async function getMyLeadCapacity() {
  const session = await requirePermission("capacity:read:self");
  const result = await leadRefillService.getCurrentLeadCapacity(session.userId);
  if (isErr(result)) {
    throwDomainError(result.error);
  }
  return result.value;
}
