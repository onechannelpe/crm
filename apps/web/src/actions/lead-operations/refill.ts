"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { leadRefillService, rateLimitDeps } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export async function requestLeadRefillNow() {
  const session = await requirePermission("lead:work");
  await checkActionRateLimit("leads.request", session.userId, rateLimitDeps);
  const result = await leadRefillService.refillQueueForExecutive(
    session.userId,
    session.branchId,
  );
  if (isErr(result)) {
    throwDomainError(result.error);
  }
  return result.value;
}
