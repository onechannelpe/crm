import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import type { AppContext } from "~/server/shared/action-runtime";
import { repos, rateLimitDeps, runInRepositoryTransaction } from "~/server/shared/context";
import type { DomainError } from "~/server/shared/domain-error";
import { createCapacityRequest } from "~/server/capacity-admin/request-capacity";
import { approveCapacityRequest, rejectCapacityRequest } from "~/server/capacity-admin/approve-capacity";
import { grantLeadCapacityDirect, grantSearchCapacityDirect } from "~/server/capacity-admin/manage-capacity";
import { Ok, type Result } from "~/server/shared/result";

import type { CapacityRequestKind } from "./types";

export async function requestCapacity(
  ctx: AppContext,
  input: { kind: CapacityRequestKind; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
  await checkActionRateLimit("capacity.request", ctx.actor.userId, rateLimitDeps);
  return createCapacityRequest(
    {
      userId: ctx.actor.userId,
      kind: input.kind,
      amount: input.amount,
      reason: input.reason,
    },
    repos,
  );
}

export async function approveCapacity(
  ctx: AppContext,
  input: { requestId: number; note: string | null },
): Promise<Result<{ success: true }, DomainError>> {
  await checkActionRateLimit("capacity.approve", ctx.actor.userId, rateLimitDeps);
  return approveCapacityRequest(
    {
      actorUserId: ctx.actor.userId,
      requestId: input.requestId,
      note: input.note,
    },
    ctx.actor,
    runInRepositoryTransaction,
  );
}

export async function rejectCapacity(
  ctx: AppContext,
  input: { requestId: number; note: string },
): Promise<Result<{ success: true }, DomainError>> {
  await checkActionRateLimit("capacity.approve", ctx.actor.userId, rateLimitDeps);
  return rejectCapacityRequest(
    {
      actorUserId: ctx.actor.userId,
      requestId: input.requestId,
      note: input.note,
    },
    ctx.actor,
    runInRepositoryTransaction,
  );
}

export async function grantSearchCapacity(
  ctx: AppContext,
  input: { targetUserId: number; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
  return grantSearchCapacityDirect(
    {
      actorUserId: ctx.actor.userId,
      targetUserId: input.targetUserId,
      amount: input.amount,
      reason: input.reason,
    },
    ctx.actor,
    repos,
  );
}

export async function grantLeadCapacity(
  ctx: AppContext,
  input: { targetUserId: number; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
  return grantLeadCapacityDirect(
    {
      actorUserId: ctx.actor.userId,
      targetUserId: input.targetUserId,
      amount: input.amount,
      reason: input.reason,
    },
    ctx.actor,
    repos,
  );
}
