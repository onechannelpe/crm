import { fail, type DomainError } from "~/domain/errors";
import type { BranchId, TeamId, UserId } from "~/domain/ids";
import type { OperationContext } from "~/server/platform/operation/context";
import { Err, Ok, type Result } from "~/shared/result";

import { resolveLeadPolicy, type LeadPolicy } from "../domain/policy";
import type { ActorScope } from "./actor-scope";

export type SetLeadScopeDefaultCommand =
  | {
      scopeType: "branch";
      scopeId: BranchId;
      bufferTarget: number;
      dailyLimit: number;
    }
  | {
      scopeType: "team";
      scopeId: TeamId;
      bufferTarget: number;
      dailyLimit: number;
    };

export interface SetLeadUserOverrideCommand {
  actorUserId: UserId;
  targetUserId: UserId;
  bufferTarget: number;
  dailyLimit: number;
  expiresAt: Date | null;
}

interface PolicyRepos {
  users: {
    findById(id: UserId): Promise<ActorScope | undefined>;
  };
  leadPolicyDefaults: {
    findForScope(
      scopeType: "branch" | "team",
      scopeId: BranchId | TeamId,
    ): Promise<
      | {
          active_buffer_target: number;
          daily_refill_limit: number;
        }
      | undefined
      | null
    >;
  };
  leadPolicyOverrides: {
    findActiveForUser(
      userId: UserId,
      activeAsOf: Date,
    ): Promise<
      | {
          active_buffer_target: number;
          daily_refill_limit: number;
        }
      | undefined
      | null
    >;
  };
}

interface LeadPolicyDefaultsWriter {
  leadPolicyDefaults: {
    upsert(values: {
      scope_type: "branch" | "team";
      scope_id: BranchId | TeamId;
      active_buffer_target: number;
      daily_refill_limit: number;
    }): Promise<unknown>;
  };
}

interface LeadPolicyOverridesWriter {
  leadPolicyOverrides: {
    replaceForUser(values: {
      user_id: UserId;
      active_buffer_target: number;
      daily_refill_limit: number;
      effective_from: Date;
      expires_at: Date | null;
      set_by_user_id: UserId;
      created_at: Date;
    }): Promise<unknown>;
  };
}

export async function getEffectiveLeadPolicy(
  userId: UserId,
  repos: PolicyRepos,
  operation: OperationContext,
): Promise<Result<LeadPolicy, DomainError>> {
  const user = await repos.users.findById(userId);
  if (!user) {
    return Err(fail("user_not_found"));
  }

  const userOverride = await repos.leadPolicyOverrides.findActiveForUser(
    userId,
    operation.operationAt,
  );
  const teamDefault = user.teamId
    ? await repos.leadPolicyDefaults.findForScope("team", user.teamId)
    : null;
  const branchDefault = await repos.leadPolicyDefaults.findForScope(
    "branch",
    user.branchId,
  );

  return Ok(resolveLeadPolicy({ userOverride, teamDefault, branchDefault }));
}

export async function setLeadScopeDefault(
  command: SetLeadScopeDefaultCommand,
  repos: LeadPolicyDefaultsWriter,
): Promise<Result<void, DomainError>> {
  await repos.leadPolicyDefaults.upsert({
    scope_type: command.scopeType,
    scope_id: command.scopeId,
    active_buffer_target: command.bufferTarget,
    daily_refill_limit: command.dailyLimit,
  });
  return Ok(undefined);
}

export async function setLeadUserOverride(
  command: SetLeadUserOverrideCommand,
  repos: LeadPolicyOverridesWriter,
  operation: OperationContext,
): Promise<Result<void, DomainError>> {
  await repos.leadPolicyOverrides.replaceForUser({
    user_id: command.targetUserId,
    active_buffer_target: command.bufferTarget,
    daily_refill_limit: command.dailyLimit,
    effective_from: operation.operationAt,
    created_at: operation.operationAt,
    expires_at: command.expiresAt,
    set_by_user_id: command.actorUserId,
  });
  return Ok(undefined);
}
