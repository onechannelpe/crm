"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { repos, rateLimitDeps } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";
import { createCapacityRequest } from "~/server/capacity-admin/request-capacity";

import { mapCapacityError } from "./errors";
import { parseCapacityAmount, parseCapacityReason } from "./input";

export async function requestMoreSearches(amount: number, reason: string) {
  const amountResult = parseCapacityAmount(amount);
  if (isErr(amountResult)) mapCapacityError(amountResult.error);

  const reasonResult = parseCapacityReason(reason);
  if (isErr(reasonResult)) mapCapacityError(reasonResult.error);

  const session = await requirePermission("capacity:request:self");
  await checkActionRateLimit("capacity.request", session.userId, rateLimitDeps);

  const result = await createCapacityRequest(
    { userId: session.userId, kind: "search_extra", amount: amountResult.value, reason: reasonResult.value },
    repos,
  );
  if (isErr(result)) mapCapacityError(result.error);

  return result.value;
}

export async function requestMoreLeadRefill(amount: number, reason: string) {
  const amountResult = parseCapacityAmount(amount);
  if (isErr(amountResult)) mapCapacityError(amountResult.error);

  const reasonResult = parseCapacityReason(reason);
  if (isErr(reasonResult)) mapCapacityError(reasonResult.error);

  const session = await requirePermission("capacity:request:self");
  await checkActionRateLimit("capacity.request", session.userId, rateLimitDeps);

  const result = await createCapacityRequest(
    { userId: session.userId, kind: "lead_refill_extra", amount: amountResult.value, reason: reasonResult.value },
    repos,
  );
  if (isErr(result)) mapCapacityError(result.error);

  return result.value;
}
