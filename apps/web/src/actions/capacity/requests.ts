"use server";

import { requirePermission } from "~/lib/auth/access/session";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { capacityRequestService, rateLimitDeps } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { fromCapacityRequestError, throwCapacityActionError } from "./errors";

export async function requestMoreSearches(amount: number, reason: string) {
  const safeAmount = assertPositiveInt(amount, "amount");
  const safeReason = assertNonEmptyString(reason, "reason");
  const session = await requirePermission("capacity:request:self");
  await checkActionRateLimit("capacity.request", session.userId, rateLimitDeps);
  const result = await capacityRequestService.createSearchExtraRequest(
    session.userId,
    safeAmount,
    safeReason,
  );
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityRequestError(result.error));
  }
  return { success: true };
}

export async function requestMoreLeadRefill(amount: number, reason: string) {
  const safeAmount = assertPositiveInt(amount, "amount");
  const safeReason = assertNonEmptyString(reason, "reason");
  const session = await requirePermission("capacity:request:self");
  await checkActionRateLimit("capacity.request", session.userId, rateLimitDeps);
  const result = await capacityRequestService.createLeadRefillExtraRequest(
    session.userId,
    safeAmount,
    safeReason,
  );
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityRequestError(result.error));
  }
  return { success: true };
}
