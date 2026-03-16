"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { leadRefillService, rateLimitDeps } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { fromLeadRefillError, throwLeadActionError } from "./errors";

export async function requestLeadRefillNow() {
  const session = await requirePermission("lead:work");
  await checkActionRateLimit("leads.request", session.userId, rateLimitDeps);
  const result = await leadRefillService.refillQueueForExecutive(
    session.userId,
    session.branchId,
  );
  if (isErr(result)) {
    throwLeadActionError(fromLeadRefillError(result.error));
  }
  return result.value;
}
