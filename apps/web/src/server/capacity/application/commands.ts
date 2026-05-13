import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { grantLeadCapacity } from "~/server/capacity-usage/lead-usage";
import { grantSearchCapacity } from "~/server/capacity-usage/search-usage";
import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive, canManageScope } from "../domain/access-policy";
import {
  normalizeDecisionNote,
  toDbCapacityRequestKind,
} from "../domain/request-policy";
import type { CapacityRequestKind, ScopeRef } from "../domain/types";
import type { CapacityCommandsContext } from "../infrastructure/commands-context";
import { setLeadScopeDefault, setLeadUserOverride } from "./lead-policy";
import { setSearchScopeDefault, setSearchUserOverride } from "./search-policy";

export async function requestCapacity(
  ctx: AppContext,
  deps: CapacityCommandsContext,
  input: { kind: CapacityRequestKind; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
  await checkActionRateLimit(
    "capacity.request",
    ctx.actor.userId,
    deps.rateLimitDeps,
  );
  return deps.uow.run(async (tx) => {
    await tx.capacityRequests.create({
      user_id: ctx.actor.userId,
      kind: toDbCapacityRequestKind(input.kind),
      status: "pending",
      requested_amount: input.amount,
      reason: input.reason,
    });
    return Ok({ success: true });
  });
}

export async function approveCapacityRequest(
  ctx: AppContext,
  deps: CapacityCommandsContext,
  input: { requestId: number; note: string | null },
): Promise<Result<{ success: true }, DomainError>> {
  await checkActionRateLimit(
    "capacity.approve",
    ctx.actor.userId,
    deps.rateLimitDeps,
  );
  return deps.uow.run(async (tx) => {
    const request = await tx.capacityRequests.findById(input.requestId);
    if (!request) {
      return Err(
        domainError("not_found", "request_not_found", "Request not found"),
      );
    }
    if (request.status !== "pending") {
      return Err(
        domainError(
          "conflict",
          "request_not_pending",
          "Request is no longer pending",
        ),
      );
    }

    const managed = await canManageExecutive(ctx.actor, request.user_id, tx);
    if (!managed.target) {
      return Err(
        domainError(
          "not_found",
          "request_target_not_found",
          "Request target not found",
        ),
      );
    }
    if (!managed.ok) {
      return Err(
        domainError("forbidden", "forbidden", "Cannot approve this request"),
      );
    }

    const note = normalizeDecisionNote(input.note);
    const approvedResult = await tx.capacityRequests.markApproved(
      request.id,
      ctx.actor.userId,
      note,
    );
    if (!approvedResult?.numUpdatedRows) {
      return Err(
        domainError(
          "conflict",
          "request_not_pending",
          "Request is no longer pending",
        ),
      );
    }

    if (request.kind === "search_extra") {
      const granted = await grantSearchCapacity(
        {
          actorUserId: ctx.actor.userId,
          targetUserId: request.user_id,
          amount: request.requested_amount,
          reason: note ?? request.reason,
        },
        tx,
      );
      if (isErr(granted)) {
        return granted;
      }
    } else {
      const granted = await grantLeadCapacity(
        {
          actorUserId: ctx.actor.userId,
          targetUserId: request.user_id,
          amount: request.requested_amount,
          reason: note ?? request.reason,
        },
        tx,
      );
      if (isErr(granted)) {
        return granted;
      }
    }

    return Ok({ success: true as const });
  });
}

export async function rejectCapacityRequest(
  ctx: AppContext,
  deps: CapacityCommandsContext,
  input: { requestId: number; note: string },
): Promise<Result<{ success: true }, DomainError>> {
  await checkActionRateLimit(
    "capacity.approve",
    ctx.actor.userId,
    deps.rateLimitDeps,
  );
  const note = normalizeDecisionNote(input.note);
  if (!note) {
    return Err(
      domainError(
        "validation",
        "decision_note_required",
        "Decision note is required for rejection",
      ),
    );
  }

  return deps.uow.run(async (tx) => {
    const request = await tx.capacityRequests.findById(input.requestId);
    if (!request) {
      return Err(
        domainError("not_found", "request_not_found", "Request not found"),
      );
    }
    if (request.status !== "pending") {
      return Err(
        domainError(
          "conflict",
          "request_not_pending",
          "Request is no longer pending",
        ),
      );
    }

    const managed = await canManageExecutive(ctx.actor, request.user_id, tx);
    if (!managed.target) {
      return Err(
        domainError(
          "not_found",
          "request_target_not_found",
          "Request target not found",
        ),
      );
    }
    if (!managed.ok) {
      return Err(
        domainError("forbidden", "forbidden", "Cannot reject this request"),
      );
    }

    const rejectedResult = await tx.capacityRequests.markRejected(
      request.id,
      ctx.actor.userId,
      note,
    );
    if (!rejectedResult?.numUpdatedRows) {
      return Err(
        domainError(
          "conflict",
          "request_not_pending",
          "Request is no longer pending",
        ),
      );
    }

    return Ok({ success: true as const });
  });
}

export async function grantSearchCapacityDirect(
  ctx: AppContext,
  deps: CapacityCommandsContext,
  input: { targetUserId: number; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
  return deps.uow.run(async (tx) => {
    const check = await canManageExecutive(ctx.actor, input.targetUserId, tx);
    if (!check.target) {
      return Err(
        domainError("not_found", "executive_not_found", "Executive not found"),
      );
    }
    if (!check.ok) {
      return Err(
        domainError(
          "forbidden",
          "cannot_manage_executive",
          "Cannot manage this executive",
        ),
      );
    }

    const result = await grantSearchCapacity(
      { actorUserId: ctx.actor.userId, ...input },
      tx,
    );
    if (isErr(result)) return result;
    return Ok({ success: true });
  });
}

export async function grantLeadCapacityDirect(
  ctx: AppContext,
  deps: CapacityCommandsContext,
  input: { targetUserId: number; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
  return deps.uow.run(async (tx) => {
    const check = await canManageExecutive(ctx.actor, input.targetUserId, tx);
    if (!check.target) {
      return Err(
        domainError("not_found", "executive_not_found", "Executive not found"),
      );
    }
    if (!check.ok) {
      return Err(
        domainError(
          "forbidden",
          "cannot_manage_executive",
          "Cannot manage this executive",
        ),
      );
    }

    const result = await grantLeadCapacity(
      { actorUserId: ctx.actor.userId, ...input },
      tx,
    );
    if (isErr(result)) return result;
    return Ok({ success: true });
  });
}

export async function updateSearchPolicyDefault(
  ctx: AppContext,
  deps: CapacityCommandsContext,
  input: { scope: ScopeRef; monthlyLimit: number },
): Promise<Result<{ success: true }, DomainError>> {
  return deps.uow.run(async (tx) => {
    const check = await canManageScope(ctx.actor, input.scope, tx);
    if (isErr(check)) return check;
    const result = await setSearchScopeDefault(
      {
        scopeType: input.scope.kind,
        scopeId: input.scope.scopeId,
        monthlyLimit: input.monthlyLimit,
      },
      tx,
    );
    if (isErr(result)) return result;
    return Ok({ success: true });
  });
}

export async function updateLeadPolicyDefault(
  ctx: AppContext,
  deps: CapacityCommandsContext,
  input: { scope: ScopeRef; bufferTarget: number; dailyLimit: number },
): Promise<Result<{ success: true }, DomainError>> {
  return deps.uow.run(async (tx) => {
    const check = await canManageScope(ctx.actor, input.scope, tx);
    if (isErr(check)) return check;
    const result = await setLeadScopeDefault(
      {
        scopeType: input.scope.kind,
        scopeId: input.scope.scopeId,
        bufferTarget: input.bufferTarget,
        dailyLimit: input.dailyLimit,
      },
      tx,
    );
    if (isErr(result)) return result;
    return Ok({ success: true });
  });
}

export async function updateSearchPolicyOverride(
  ctx: AppContext,
  deps: CapacityCommandsContext,
  input: { userId: number; monthlyLimit: number; expiresAt: number | null },
): Promise<Result<{ success: true }, DomainError>> {
  return deps.uow.run(async (tx) => {
    const check = await canManageExecutive(ctx.actor, input.userId, tx);
    if (!check.target) {
      return Err(
        domainError("not_found", "executive_not_found", "Executive not found"),
      );
    }
    if (!check.ok) {
      return Err(
        domainError(
          "forbidden",
          "cannot_manage_executive",
          "Cannot manage this executive",
        ),
      );
    }
    const result = await setSearchUserOverride(
      {
        actorUserId: ctx.actor.userId,
        targetUserId: input.userId,
        monthlyLimit: input.monthlyLimit,
        expiresAt: input.expiresAt,
      },
      tx,
    );
    if (isErr(result)) return result;
    return Ok({ success: true });
  });
}

export async function updateLeadPolicyOverride(
  ctx: AppContext,
  deps: CapacityCommandsContext,
  input: {
    userId: number;
    bufferTarget: number;
    dailyLimit: number;
    expiresAt: number | null;
  },
): Promise<Result<{ success: true }, DomainError>> {
  return deps.uow.run(async (tx) => {
    const check = await canManageExecutive(ctx.actor, input.userId, tx);
    if (!check.target) {
      return Err(
        domainError("not_found", "executive_not_found", "Executive not found"),
      );
    }
    if (!check.ok) {
      return Err(
        domainError(
          "forbidden",
          "cannot_manage_executive",
          "Cannot manage this executive",
        ),
      );
    }
    const result = await setLeadUserOverride(
      {
        actorUserId: ctx.actor.userId,
        targetUserId: input.userId,
        bufferTarget: input.bufferTarget,
        dailyLimit: input.dailyLimit,
        expiresAt: input.expiresAt,
      },
      tx,
    );
    if (isErr(result)) return result;
    return Ok({ success: true });
  });
}
