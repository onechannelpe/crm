"use server";

import { validationError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { config } from "~/lib/config";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { capacityRequestService, rateLimitDeps } from "~/server/shared/context";
import { asUserId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import { fromCapacityRequestError, throwCapacityActionError } from "./errors";

function validateCapacityRequestInput(amount: number, reason: string) {
  const safeAmount = assertPositiveInt(amount, "amount");
  if (safeAmount > config.capacityRequests.maxRequestAmount) {
    throw validationError("amount exceeds configured maximum");
  }

  return {
    amount: safeAmount,
    reason: assertNonEmptyString(reason, "reason"),
  };
}

export async function requestMoreSearches(amount: number, reason: string) {
  const validated = validateCapacityRequestInput(amount, reason);
  const session = await requirePermission("capacity:request:self");
  await checkActionRateLimit("capacity.request", session.userId, rateLimitDeps);
  const userId = asUserId(session.userId);
  const result = await capacityRequestService.createSearchExtraRequest({
    userId,
    amount: validated.amount,
    reason: validated.reason,
  });
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityRequestError(result.error));
  }
  return { success: true };
}

export async function requestMoreLeadRefill(amount: number, reason: string) {
  const validated = validateCapacityRequestInput(amount, reason);
  const session = await requirePermission("capacity:request:self");
  await checkActionRateLimit("capacity.request", session.userId, rateLimitDeps);
  const userId = asUserId(session.userId);
  const result = await capacityRequestService.createLeadRefillExtraRequest({
    userId,
    amount: validated.amount,
    reason: validated.reason,
  });
  if (isErr(result)) {
    throwCapacityActionError(fromCapacityRequestError(result.error));
  }
  return { success: true };
}
