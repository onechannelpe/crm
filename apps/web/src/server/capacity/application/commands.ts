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
import type {
  CapacityCommandRepos,
  CapacityCommandsContext,
} from "../infrastructure/commands-context";
import { setLeadScopeDefault, setLeadUserOverride } from "./lead-policy";
import type { CapacityApprovalPort, CapacityApprovalTxPort } from "./ports";
import { setSearchScopeDefault, setSearchUserOverride } from "./search-policy";

class RollbackError extends Error {
  constructor(readonly domainErr: DomainError) {
    super(domainErr.message);
  }
}

function rollback(err: DomainError): never {
  throw new RollbackError(err);
}

function toManagedScopeRepos(tx: CapacityApprovalTxPort) {
  return {
    users: {
      findById: async (userId: number) => {
        const user = await tx.findManagedUserById(userId);
        if (!user) return undefined;
        return {
          role: user.role,
          branch_id: user.branchId,
          team_id: user.teamId,
        };
      },
    },
    teams: {
      findBySupervisorId: (supervisorId: number) =>
        tx.findSupervisedTeamBySupervisorId(supervisorId),
      findByIdWithSupervisor: async (teamId: number) => {
        const team = await tx.findManagedTeamById(teamId);
        if (!team) return undefined;
        return {
          id: team.id,
          branch_id: team.branchId,
          supervisor_id: team.supervisorId,
        };
      },
    },
  };
}

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
  try {
    await deps.repos.capacityRequests.create({
      user_id: ctx.actor.userId,
      kind: toDbCapacityRequestKind(input.kind),
      status: "pending",
      requested_amount: input.amount,
      reason: input.reason,
    });
    return Ok({ success: true });
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error ? error.message : "Request creation failed",
      ),
    );
  }
}

export async function approveCapacityRequest(
  ctx: AppContext,
  port: CapacityApprovalPort,
  input: { requestId: number; note: string | null },
): Promise<Result<{ success: true }, DomainError>> {
  await port.enforceApprovalRateLimit(ctx.actor.userId);
  try {
    const result = await port.withTransaction(async (tx) => {
      const request = await tx.findRequestById(input.requestId);
      if (!request) {
        rollback(
          domainError("not_found", "request_not_found", "Request not found"),
        );
      }
      if (request.status !== "pending") {
        rollback(
          domainError(
            "conflict",
            "request_not_pending",
            "Request is no longer pending",
          ),
        );
      }

      const managed = await canManageExecutive(
        ctx.actor,
        request.userId,
        toManagedScopeRepos(tx),
      );
      if (!managed.target) {
        rollback(
          domainError(
            "not_found",
            "request_target_not_found",
            "Request target not found",
          ),
        );
      }
      if (!managed.ok) {
        rollback(
          domainError("forbidden", "forbidden", "Cannot approve this request"),
        );
      }

      const note = normalizeDecisionNote(input.note);
      const approved = await tx.markRequestApproved(
        request.id,
        ctx.actor.userId,
        note,
      );
      if (!approved) {
        rollback(
          domainError(
            "conflict",
            "request_not_pending",
            "Request is no longer pending",
          ),
        );
      }

      if (request.kind === "search_extra") {
        try {
          await tx.grantSearchCapacity({
            actorUserId: ctx.actor.userId,
            userId: request.userId,
            amount: request.requestedAmount,
            reason: note ?? request.reason,
          });
        } catch (error) {
          rollback(
            domainError(
              "unexpected",
              "unexpected",
              error instanceof Error
                ? error.message
                : "Failed to grant search capacity",
            ),
          );
        }
      } else {
        try {
          await tx.grantLeadCapacity({
            actorUserId: ctx.actor.userId,
            userId: request.userId,
            amount: request.requestedAmount,
            reason: note ?? request.reason,
          });
        } catch (error) {
          rollback(
            domainError(
              "unexpected",
              "unexpected",
              error instanceof Error
                ? error.message
                : "Failed to grant lead capacity",
            ),
          );
        }
      }

      return { success: true as const };
    });

    return Ok(result);
  } catch (error) {
    if (error instanceof RollbackError) return Err(error.domainErr);
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error ? error.message : "Approval failed",
      ),
    );
  }
}

export async function rejectCapacityRequest(
  ctx: AppContext,
  port: CapacityApprovalPort,
  input: { requestId: number; note: string },
): Promise<Result<{ success: true }, DomainError>> {
  await port.enforceApprovalRateLimit(ctx.actor.userId);
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

  try {
    const result = await port.withTransaction(async (tx) => {
      const request = await tx.findRequestById(input.requestId);
      if (!request) {
        rollback(
          domainError("not_found", "request_not_found", "Request not found"),
        );
      }
      if (request.status !== "pending") {
        rollback(
          domainError(
            "conflict",
            "request_not_pending",
            "Request is no longer pending",
          ),
        );
      }

      const managed = await canManageExecutive(
        ctx.actor,
        request.userId,
        toManagedScopeRepos(tx),
      );
      if (!managed.target) {
        rollback(
          domainError(
            "not_found",
            "request_target_not_found",
            "Request target not found",
          ),
        );
      }
      if (!managed.ok) {
        rollback(
          domainError("forbidden", "forbidden", "Cannot reject this request"),
        );
      }

      const rejected = await tx.markRequestRejected(
        request.id,
        ctx.actor.userId,
        note,
      );
      if (!rejected) {
        rollback(
          domainError(
            "conflict",
            "request_not_pending",
            "Request is no longer pending",
          ),
        );
      }

      return { success: true as const };
    });

    return Ok(result);
  } catch (error) {
    if (error instanceof RollbackError) return Err(error.domainErr);
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error ? error.message : "Rejection failed",
      ),
    );
  }
}

export async function grantSearchCapacityDirect(
  ctx: AppContext,
  repos: CapacityCommandRepos,
  input: { targetUserId: number; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
  const check = await canManageExecutive(ctx.actor, input.targetUserId, repos);
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
    repos,
  );
  if (isErr(result)) return result;
  return Ok({ success: true });
}

export async function grantLeadCapacityDirect(
  ctx: AppContext,
  repos: CapacityCommandRepos,
  input: { targetUserId: number; amount: number; reason: string },
): Promise<Result<{ success: true }, DomainError>> {
  const check = await canManageExecutive(ctx.actor, input.targetUserId, repos);
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
    repos,
  );
  if (isErr(result)) return result;
  return Ok({ success: true });
}

export async function updateSearchPolicyDefault(
  ctx: AppContext,
  repos: CapacityCommandRepos,
  input: { scope: ScopeRef; monthlyLimit: number },
): Promise<Result<{ success: true }, DomainError>> {
  const check = await canManageScope(ctx.actor, input.scope, repos);
  if (isErr(check)) return check;
  const result = await setSearchScopeDefault(
    {
      scopeType: input.scope.kind,
      scopeId: input.scope.scopeId,
      monthlyLimit: input.monthlyLimit,
    },
    repos,
  );
  if (isErr(result)) return result;
  return Ok({ success: true });
}

export async function updateLeadPolicyDefault(
  ctx: AppContext,
  repos: CapacityCommandRepos,
  input: { scope: ScopeRef; bufferTarget: number; dailyLimit: number },
): Promise<Result<{ success: true }, DomainError>> {
  const check = await canManageScope(ctx.actor, input.scope, repos);
  if (isErr(check)) return check;
  const result = await setLeadScopeDefault(
    {
      scopeType: input.scope.kind,
      scopeId: input.scope.scopeId,
      bufferTarget: input.bufferTarget,
      dailyLimit: input.dailyLimit,
    },
    repos,
  );
  if (isErr(result)) return result;
  return Ok({ success: true });
}

export async function updateSearchPolicyOverride(
  ctx: AppContext,
  repos: CapacityCommandRepos,
  input: { userId: number; monthlyLimit: number; expiresAt: number | null },
): Promise<Result<{ success: true }, DomainError>> {
  const check = await canManageExecutive(ctx.actor, input.userId, repos);
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
    repos,
  );
  if (isErr(result)) return result;
  return Ok({ success: true });
}

export async function updateLeadPolicyOverride(
  ctx: AppContext,
  repos: CapacityCommandRepos,
  input: {
    userId: number;
    bufferTarget: number;
    dailyLimit: number;
    expiresAt: number | null;
  },
): Promise<Result<{ success: true }, DomainError>> {
  const check = await canManageExecutive(ctx.actor, input.userId, repos);
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
    repos,
  );
  if (isErr(result)) return result;
  return Ok({ success: true });
}
