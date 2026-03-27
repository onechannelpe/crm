import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import { resolveLeadPolicy, type LeadPolicy } from "./domain";
import type { LeadPolicyDefaultsRepo, LeadPolicyOverridesRepo } from "./repos";

export type { LeadPolicy };

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
    findById(
      id: UserId,
    ): Promise<{ team_id: number | null; branch_id: number } | undefined>;
  };
  leadPolicyDefaults: LeadPolicyDefaultsRepo;
  leadPolicyOverrides: LeadPolicyOverridesRepo;
}

export async function getEffectiveLeadPolicy(
  userId: UserId,
  repos: PolicyRepos,
): Promise<Result<LeadPolicy, DomainError>> {
  try {
    const user = await repos.users.findById(userId);
    if (!user) {
      return Err(domainError("not_found", "user_not_found", "User not found"));
    }

    const now = Date.now();
    const userOverride = await repos.leadPolicyOverrides.findActiveForUser(
      userId,
      now,
    );
    const teamDefault = user.team_id
      ? await repos.leadPolicyDefaults.findForScope("team", user.team_id)
      : null;
    const branchDefault = await repos.leadPolicyDefaults.findForScope(
      "branch",
      user.branch_id,
    );

    return Ok(resolveLeadPolicy({ userOverride, teamDefault, branchDefault }));
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to resolve lead policy",
      ),
    );
  }
}

export async function setLeadScopeDefault(
  command: SetLeadScopeDefaultCommand,
  repos: Pick<PolicyRepos, "leadPolicyDefaults">,
): Promise<Result<void, DomainError>> {
  try {
    await repos.leadPolicyDefaults.upsert({
      scope_type: command.scopeType,
      scope_id: command.scopeId,
      active_buffer_target: command.bufferTarget,
      daily_refill_limit: command.dailyLimit,
    });
    return Ok(undefined);
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to set lead scope default",
      ),
    );
  }
}

export async function setLeadUserOverride(
  command: SetLeadUserOverrideCommand,
  repos: Pick<PolicyRepos, "leadPolicyOverrides">,
): Promise<Result<void, DomainError>> {
  try {
    await repos.leadPolicyOverrides.replaceForUser({
      user_id: command.targetUserId,
      active_buffer_target: command.bufferTarget,
      daily_refill_limit: command.dailyLimit,
      effective_from: Date.now(),
      expires_at: command.expiresAt,
      set_by_user_id: command.actorUserId,
    });
    return Ok(undefined);
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to set lead user override",
      ),
    );
  }
}
