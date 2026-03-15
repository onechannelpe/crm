import { config } from "~/lib/config";
import type { Repositories } from "~/server/shared/registry";

export interface EffectiveSearchPolicy {
  source: "user" | "team" | "branch" | "system";
  monthlySearchLimit: number;
}

export function createSearchPolicyService(repos: Repositories) {
  return {
    async getEffectiveSearchPolicy(
      userId: number,
    ): Promise<EffectiveSearchPolicy> {
      const now = Date.now();
      const user = await repos.users.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const userOverride = await repos.searchPolicyOverrides.findActiveForUser(
        userId,
        now,
      );
      if (userOverride) {
        return {
          source: "user",
          monthlySearchLimit: userOverride.search_limit,
        };
      }

      if (user.team_id) {
        const teamDefault = await repos.searchPolicyDefaults.findForScope(
          "team",
          user.team_id,
        );
        if (teamDefault) {
          return {
            source: "team",
            monthlySearchLimit: teamDefault.search_limit,
          };
        }
      }

      const branchDefault = await repos.searchPolicyDefaults.findForScope(
        "branch",
        user.branch_id,
      );
      if (branchDefault) {
        return {
          source: "branch",
          monthlySearchLimit: branchDefault.search_limit,
        };
      }

      return {
        source: "system",
        monthlySearchLimit: config.searchAccess.defaultMonthlyLimit,
      };
    },

    setScopeDefault(input: {
      scopeType: "branch" | "team";
      scopeId: number;
      monthlySearchLimit: number;
    }) {
      return repos.searchPolicyDefaults.upsert({
        scope_type: input.scopeType,
        scope_id: input.scopeId,
        period_type: "month",
        search_limit: input.monthlySearchLimit,
      });
    },

    setUserOverride(input: {
      targetUserId: number;
      monthlySearchLimit: number;
      setByUserId: number;
      expiresAt: number | null;
    }) {
      return repos.searchPolicyOverrides.replaceForUser({
        user_id: input.targetUserId,
        search_limit: input.monthlySearchLimit,
        effective_from: Date.now(),
        expires_at: input.expiresAt,
        set_by_user_id: input.setByUserId,
      });
    },

    getEffectivePolicy(userId: number) {
      return this.getEffectiveSearchPolicy(userId);
    },
  };
}
