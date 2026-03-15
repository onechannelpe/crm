"use server";

import { internalError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { leadRefillService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export async function requestLeadRefillNow() {
  const session = await requirePermission("lead:work");
  await checkActionRateLimit("leads.request", session.userId, repos);
  const result = await leadRefillService.refillQueueForExecutive(
    session.userId,
    session.branchId,
  );
  if (isErr(result)) {
    throw internalError(result.error.message);
  }
  return result.value;
}
