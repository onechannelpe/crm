import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

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
  expiresAt: number | null;
}

interface PolicyRepos {
  users: {
    findById(id: UserId): Promise<ActorScope | undefined>;
  };
  leadPolicyDefaults: {
    findForScope(
      scopeType: "branch" | "team",
      scopeId: number,
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
      now: number,
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
      scope_id: number;
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
      effective_from: number;
      expires_at: number | null;
      set_by_user_id: UserId;
    }): Promise<unknown>;
  };
}

export async function getEffectiveLeadPolicy(
  userId: UserId,
  repos: PolicyRepos,
): Promise<Result<LeadPolicy, DomainError>> {
  const user = await repos.users.findById(userId);
  if (!user) {
    return Err(domainError("not_found", "user_not_found", "User not found"));
  }

  const now = Date.now();
  const userOverride = await repos.leadPolicyOverrides.findActiveForUser(
    userId,
    now,
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
): Promise<Result<void, DomainError>> {
  await repos.leadPolicyOverrides.replaceForUser({
    user_id: command.targetUserId,
    active_buffer_target: command.bufferTarget,
    daily_refill_limit: command.dailyLimit,
    effective_from: Date.now(),
    expires_at: command.expiresAt,
    set_by_user_id: command.actorUserId,
  });
  return Ok(undefined);
}
