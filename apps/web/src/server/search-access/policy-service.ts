import { config } from "~/lib/config";
import type { PolicySource, ScopeType } from "~/server/shared/pipeline-types";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

export interface EffectiveSearchPolicy {
  source: PolicySource;
  monthlySearchLimit: number;
}

type SearchPolicyValue = {
  search_limit: number;
};

export function resolveEffectiveSearchPolicy(input: {
  userOverride?: SearchPolicyValue | null;
  teamDefault?: SearchPolicyValue | null;
  branchDefault?: SearchPolicyValue | null;
}): EffectiveSearchPolicy {
  if (input.userOverride) {
    return {
      source: "user",
      monthlySearchLimit: input.userOverride.search_limit,
    };
  }

  if (input.teamDefault) {
    return {
      source: "team",
      monthlySearchLimit: input.teamDefault.search_limit,
    };
  }

  if (input.branchDefault) {
    return {
      source: "branch",
      monthlySearchLimit: input.branchDefault.search_limit,
    };
  }

  return {
    source: "system",
    monthlySearchLimit: config.searchAccess.defaultMonthlyLimit,
  };
}

export type SearchPolicyError =
  | { reason: "user_not_found"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export function createSearchPolicyService(repos: Repositories) {
  return {
    async getEffectiveSearchPolicy(
      userId: number,
    ): Promise<Result<EffectiveSearchPolicy, SearchPolicyError>> {
      try {
        const now = Date.now();
        const user = await repos.users.findById(userId);
        if (!user) {
          return Err({ reason: "user_not_found", message: "User not found" });
        }

        const userOverride =
          await repos.searchPolicyOverrides.findActiveForUser(userId, now);
        const teamDefault = user.team_id
          ? await repos.searchPolicyDefaults.findForScope("team", user.team_id)
          : null;
        const branchDefault = await repos.searchPolicyDefaults.findForScope(
          "branch",
          user.branch_id,
        );

        return Ok(
          resolveEffectiveSearchPolicy({
            userOverride,
            teamDefault,
            branchDefault,
          }),
        );
      } catch (error) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Failed to resolve search policy",
        });
      }
    },

    async setScopeDefault(input: {
      scopeType: ScopeType;
      scopeId: number;
      monthlySearchLimit: number;
    }): Promise<Result<void, SearchPolicyError>> {
      if (input.monthlySearchLimit > config.searchAccess.maxMonthlyLimit) {
        return Err({
          reason: "validation",
          message: "Monthly search limit exceeds configured maximum",
        });
      }

      try {
        await repos.searchPolicyDefaults.upsert({
          scope_type: input.scopeType,
          scope_id: input.scopeId,
          period_type: "month",
          search_limit: input.monthlySearchLimit,
        });
        return Ok(undefined);
      } catch (error) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Failed to set search scope default",
        });
      }
    },

    async setUserOverride(input: {
      targetUserId: number;
      monthlySearchLimit: number;
      setByUserId: number;
      expiresAt: number | null;
    }): Promise<Result<void, SearchPolicyError>> {
      if (input.monthlySearchLimit > config.searchAccess.maxMonthlyLimit) {
        return Err({
          reason: "validation",
          message: "Monthly search limit exceeds configured maximum",
        });
      }

      try {
        const user = await repos.users.findById(input.targetUserId);
        if (!user) {
          return Err({ reason: "user_not_found", message: "User not found" });
        }

        await repos.searchPolicyOverrides.replaceForUser({
          user_id: input.targetUserId,
          search_limit: input.monthlySearchLimit,
          effective_from: Date.now(),
          expires_at: input.expiresAt,
          set_by_user_id: input.setByUserId,
        });
        return Ok(undefined);
      } catch (error) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Failed to set search user override",
        });
      }
    },
  };
}
