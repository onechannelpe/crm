"use server";

import { internalError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { capacityRequestService, repos } from "~/server/shared/context";

export async function requestMoreSearches(amount: number, reason: string) {
  const safeAmount = assertPositiveInt(amount, "amount");
  const safeReason = assertNonEmptyString(reason, "reason");
  const session = await requirePermission("capacity:request:self");
  await checkActionRateLimit("capacity.request", session.userId, repos);
  try {
    await capacityRequestService.createSearchExtraRequest(
      session.userId,
      safeAmount,
      safeReason,
    );
    return { success: true };
  } catch (error) {
    throw internalError(
      error instanceof Error ? error.message : "Request failed",
    );
  }
}

export async function requestMoreLeadRefill(amount: number, reason: string) {
  const safeAmount = assertPositiveInt(amount, "amount");
  const safeReason = assertNonEmptyString(reason, "reason");
  const session = await requirePermission("capacity:request:self");
  await checkActionRateLimit("capacity.request", session.userId, repos);
  try {
    await capacityRequestService.createLeadRefillExtraRequest(
      session.userId,
      safeAmount,
      safeReason,
    );
    return { success: true };
  } catch (error) {
    throw internalError(
      error instanceof Error ? error.message : "Request failed",
    );
  }
}
