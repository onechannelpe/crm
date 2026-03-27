import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import { resolveSearchPolicy, type SearchPolicy } from "./domain";
import type {
  SearchPolicyDefaultsRepo,
  SearchPolicyOverridesRepo,
} from "./repos";

export type { SearchPolicy };

export type SetSearchScopeDefaultCommand =
  | { scopeType: "branch"; scopeId: BranchId; monthlyLimit: number }
  | { scopeType: "team"; scopeId: TeamId; monthlyLimit: number };

export interface SetSearchUserOverrideCommand {
  actorUserId: UserId;
  targetUserId: UserId;
  monthlyLimit: number;
  expiresAt: number | null;
}

interface PolicyRepos {
  users: {
    findById(
      id: UserId,
    ): Promise<{ team_id: number | null; branch_id: number } | undefined>;
  };
  searchPolicyDefaults: SearchPolicyDefaultsRepo;
  searchPolicyOverrides: SearchPolicyOverridesRepo;
}

export async function getEffectiveSearchPolicy(
  userId: UserId,
  repos: PolicyRepos,
): Promise<Result<SearchPolicy, DomainError>> {
  try {
    const user = await repos.users.findById(userId);
    if (!user) {
      return Err(domainError("not_found", "user_not_found", "User not found"));
    }

    const now = Date.now();
    const userOverride = await repos.searchPolicyOverrides.findActiveForUser(
      userId,
      now,
    );
    const teamDefault = user.team_id
      ? await repos.searchPolicyDefaults.findForScope("team", user.team_id)
      : null;
    const branchDefault = await repos.searchPolicyDefaults.findForScope(
      "branch",
      user.branch_id,
    );

    return Ok(
      resolveSearchPolicy({ userOverride, teamDefault, branchDefault }),
    );
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to resolve search policy",
      ),
    );
  }
}

export async function setSearchScopeDefault(
  command: SetSearchScopeDefaultCommand,
  repos: Pick<PolicyRepos, "searchPolicyDefaults">,
): Promise<Result<void, DomainError>> {
  try {
    await repos.searchPolicyDefaults.upsert({
      scope_type: command.scopeType,
      scope_id: command.scopeId,
      period_type: "month",
      search_limit: command.monthlyLimit,
    });
    return Ok(undefined);
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to set search scope default",
      ),
    );
  }
}

export async function setSearchUserOverride(
  command: SetSearchUserOverrideCommand,
  repos: Pick<PolicyRepos, "searchPolicyOverrides">,
): Promise<Result<void, DomainError>> {
  try {
    await repos.searchPolicyOverrides.replaceForUser({
      user_id: command.targetUserId,
      search_limit: command.monthlyLimit,
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
          : "Failed to set search user override",
      ),
    );
  }
}
