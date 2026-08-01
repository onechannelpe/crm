import { fail, type DomainError } from "~/domain/errors";
import type { BranchId, TeamId, UserId } from "~/domain/ids";
import { Err, Ok, type Result } from "~/shared/result";

import { resolveSearchPolicy, type SearchPolicy } from "../domain/policy";
import type { ActorScope } from "./actor-scope";

export type SetSearchScopeDefaultCommand =
  | { scopeType: "branch"; scopeId: BranchId; monthlyLimit: number }
  | { scopeType: "team"; scopeId: TeamId; monthlyLimit: number };

export interface SetSearchUserOverrideCommand {
  actorUserId: UserId;
  targetUserId: UserId;
  monthlyLimit: number;
  expiresAt: Date | null;
  /** Operation instant: when the override takes effect and is recorded. */
  at: Date;
}

interface PolicyRepos {
  users: {
    findById(id: UserId): Promise<ActorScope | undefined>;
  };
  searchPolicyDefaults: {
    findForScope(
      scopeType: "branch" | "team",
      scopeId: BranchId | TeamId,
    ): Promise<{ search_limit: number } | undefined | null>;
  };
  searchPolicyOverrides: {
    findActiveForUser(
      userId: UserId,
      now: Date,
    ): Promise<{ search_limit: number } | undefined | null>;
  };
}

interface SearchPolicyDefaultsWriter {
  searchPolicyDefaults: {
    upsert(values: {
      scope_type: "branch" | "team";
      scope_id: BranchId | TeamId;
      period_type: "month";
      search_limit: number;
    }): Promise<unknown>;
  };
}

interface SearchPolicyOverridesWriter {
  searchPolicyOverrides: {
    replaceForUser(values: {
      user_id: UserId;
      search_limit: number;
      effective_from: Date;
      expires_at: Date | null;
      set_by_user_id: UserId;
      created_at: Date;
    }): Promise<unknown>;
  };
}

export async function getEffectiveSearchPolicy(
  userId: UserId,
  repos: PolicyRepos,
  evaluatedAt: Date,
): Promise<Result<SearchPolicy, DomainError>> {
  const user = await repos.users.findById(userId);
  if (!user) {
    return Err(fail("user_not_found"));
  }

  const userOverride = await repos.searchPolicyOverrides.findActiveForUser(
    userId,
    evaluatedAt,
  );
  const teamDefault = user.teamId
    ? await repos.searchPolicyDefaults.findForScope("team", user.teamId)
    : null;
  const branchDefault = await repos.searchPolicyDefaults.findForScope(
    "branch",
    user.branchId,
  );

  return Ok(resolveSearchPolicy({ userOverride, teamDefault, branchDefault }));
}

export async function setSearchScopeDefault(
  command: SetSearchScopeDefaultCommand,
  repos: SearchPolicyDefaultsWriter,
): Promise<Result<void, DomainError>> {
  await repos.searchPolicyDefaults.upsert({
    scope_type: command.scopeType,
    scope_id: command.scopeId,
    period_type: "month",
    search_limit: command.monthlyLimit,
  });
  return Ok(undefined);
}

export async function setSearchUserOverride(
  command: SetSearchUserOverrideCommand,
  repos: SearchPolicyOverridesWriter,
): Promise<Result<void, DomainError>> {
  await repos.searchPolicyOverrides.replaceForUser({
    user_id: command.targetUserId,
    search_limit: command.monthlyLimit,
    effective_from: command.at,
    created_at: command.at,
    expires_at: command.expiresAt,
    set_by_user_id: command.actorUserId,
  });
  return Ok(undefined);
}
