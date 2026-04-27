import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import { resolveSearchPolicy, type SearchPolicy } from "../domain/policy";
import type {
  SearchPolicyDefaultsRepo,
  SearchPolicyOverridesRepo,
} from "../infrastructure/policy-repos";
import type { ActorScope } from "./actor-scope";

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
    findById(id: UserId): Promise<ActorScope | undefined>;
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
    const teamDefault = user.teamId
      ? await repos.searchPolicyDefaults.findForScope("team", user.teamId)
      : null;
    const branchDefault = await repos.searchPolicyDefaults.findForScope(
      "branch",
      user.branchId,
    );

    return Ok(
      resolveSearchPolicy({ userOverride, teamDefault, branchDefault }),
    );
  } catch (error) {
    throw error;
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
    throw error;
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
    throw error;
  }
}
