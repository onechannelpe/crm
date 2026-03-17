"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { capacityRequestService, rateLimitDeps } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { parseCapacityAmount, parseCapacityReason } from "./capacity-input";

export async function requestMoreSearches(amount: number, reason: string) {
  const amountResult = parseCapacityAmount(amount);
  if (isErr(amountResult)) {
    throwDomainError(amountResult.error);
  }
  const reasonResult = parseCapacityReason(reason);
  if (isErr(reasonResult)) {
    throwDomainError(reasonResult.error);
  }
  const session = await requirePermission("capacity:request:self");
  await checkActionRateLimit("capacity.request", session.userId, rateLimitDeps);
  const result = await capacityRequestService.createSearchExtraRequest({
    userId: session.userId,
    amount: amountResult.value,
    reason: reasonResult.value,
  });
  if (isErr(result)) {
    throwDomainError(result.error);
  }
  return { success: true };
}

export async function requestMoreLeadRefill(amount: number, reason: string) {
  const amountResult = parseCapacityAmount(amount);
  if (isErr(amountResult)) {
    throwDomainError(amountResult.error);
  }
  const reasonResult = parseCapacityReason(reason);
  if (isErr(reasonResult)) {
    throwDomainError(reasonResult.error);
  }
  const session = await requirePermission("capacity:request:self");
  await checkActionRateLimit("capacity.request", session.userId, rateLimitDeps);
  const result = await capacityRequestService.createLeadRefillExtraRequest({
    userId: session.userId,
    amount: amountResult.value,
    reason: reasonResult.value,
  });
  if (isErr(result)) {
    throwDomainError(result.error);
  }
  return { success: true };
}
