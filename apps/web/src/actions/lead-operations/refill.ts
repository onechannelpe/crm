"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { leadRefillService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { throwLeadActionError } from "./errors";

export async function requestLeadRefillNow() {
  const session = await requirePermission("lead:work");
  await checkActionRateLimit("leads.request", session.userId, repos);
  const result = await leadRefillService.refillQueueForExecutive(
    session.userId,
    session.branchId,
  );
  if (isErr(result)) {
    if (result.error.reason === "refill_exhausted") {
      throwLeadActionError({
        reason: "conflict",
        message: result.error.message,
      });
    }
    if (result.error.reason === "user_not_found") {
      throwLeadActionError({
        reason: "not_found",
        message: result.error.message,
      });
    }
    throwLeadActionError({
      reason: "unexpected",
      message: result.error.message,
    });
  }
  return result.value;
}
