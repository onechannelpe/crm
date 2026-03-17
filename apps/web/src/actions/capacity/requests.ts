"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { capacityRequestService, rateLimitDeps } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { fromCapacityRequestError, throwCapacityActionError } from "./errors";

export async function requestMoreSearches(amount: number, reason: string) {
  const session = await requirePermission("capacity:request:self");
  await checkActionRateLimit("capacity.request", session.userId, rateLimitDeps);
  const result = await capacityRequestService.createSearchExtraRequest({
    userId: session.userId,
    amount,
    reason,
  });
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityRequestError(result.error));
  }
  return { success: true };
}

export async function requestMoreLeadRefill(amount: number, reason: string) {
  const session = await requirePermission("capacity:request:self");
  await checkActionRateLimit("capacity.request", session.userId, rateLimitDeps);
  const result = await capacityRequestService.createLeadRefillExtraRequest({
    userId: session.userId,
    amount,
    reason,
  });
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityRequestError(result.error));
  }
  return { success: true };
}
