"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { parseCapacityDecisionInput, parseCapacityGrantInput } from "./input";

function parseRejection(
  requestId: number,
  note: string,
): Result<{ requestId: number; note: string }, DomainError> {
  const decision = parseCapacityDecisionInput({ requestId, note });
  if (!decision.ok) return decision;
  if (!decision.value.note) {
    return Err(
      domainError(
        "validation",
        "capacity.reject.note_required",
        "note is required",
      ),
    );
  }
  return Ok({ requestId: decision.value.requestId, note: decision.value.note });
}

export async function approveCapacity(requestId: number, note?: string) {
  return runAction({
    actionName: "capacity.approve",
    access: { kind: "permission", permission: "capacity:approve" },
    parse: () => parseCapacityDecisionInput({ requestId, note }),
    audit: ({ requestId }) => ({ requestId }),
    execute: (ctx, decision) =>
      getServerRuntime().capacity.useCases.approveCapacityRequest(
        ctx,
        decision,
      ),
  });
}

export async function rejectCapacity(requestId: number, note: string) {
  return runAction({
    actionName: "capacity.reject",
    access: { kind: "permission", permission: "capacity:approve" },
    parse: () => parseRejection(requestId, note),
    audit: ({ requestId }) => ({ requestId }),
    execute: (ctx, rejection) =>
      getServerRuntime().capacity.useCases.rejectCapacityRequest(
        ctx,
        rejection,
      ),
  });
}

export async function grantMoreSearches(
  userId: number,
  amount: number,
  reason: string,
) {
  return runAction({
    actionName: "capacity.grant_search",
    access: { kind: "permission", permission: "capacity:manage" },
    parse: () => parseCapacityGrantInput({ userId, amount, reason }),
    audit: ({ userId, amount }) => ({ userId, amount }),
    execute: (ctx, grant) =>
      getServerRuntime().capacity.useCases.grantSearchCapacityDirect(ctx, {
        targetUserId: grant.userId,
        amount: grant.amount,
        reason: grant.reason,
      }),
  });
}

export async function grantMoreLeadRefill(
  userId: number,
  amount: number,
  reason: string,
) {
  return runAction({
    actionName: "capacity.grant_lead",
    access: { kind: "permission", permission: "capacity:manage" },
    parse: () => parseCapacityGrantInput({ userId, amount, reason }),
    audit: ({ userId, amount }) => ({ userId, amount }),
    execute: (ctx, grant) =>
      getServerRuntime().capacity.useCases.grantLeadCapacityDirect(ctx, {
        targetUserId: grant.userId,
        amount: grant.amount,
        reason: grant.reason,
      }),
  });
}
