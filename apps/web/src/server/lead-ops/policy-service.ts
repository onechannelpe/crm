import { config } from "~/lib/config";
import type { Repositories } from "~/server/shared/registry";

export interface EffectiveLeadPolicy {
  source: "user" | "team" | "branch" | "system";
  activeBufferTarget: number;
  dailyRefillLimit: number;
}

export function createLeadPolicyService(repos: Repositories) {
  return {
    async getEffectivePolicy(userId: number): Promise<EffectiveLeadPolicy> {
      const now = Date.now();
      const user = await repos.users.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      const userOverride = await repos.leadPolicyOverrides.findActiveForUser(
        userId,
        now,
      );
      if (userOverride) {
        return {
          source: "user",
          activeBufferTarget: userOverride.active_buffer_target,
          dailyRefillLimit: userOverride.daily_refill_limit,
        };
      }

      if (user.team_id) {
        const teamDefault = await repos.leadPolicyDefaults.findForScope(
          "team",
          user.team_id,
        );
        if (teamDefault) {
          return {
            source: "team",
            activeBufferTarget: teamDefault.active_buffer_target,
            dailyRefillLimit: teamDefault.daily_refill_limit,
          };
        }
      }

      const branchDefault = await repos.leadPolicyDefaults.findForScope(
        "branch",
        user.branch_id,
      );
      if (branchDefault) {
        return {
          source: "branch",
          activeBufferTarget: branchDefault.active_buffer_target,
          dailyRefillLimit: branchDefault.daily_refill_limit,
        };
      }

      return {
        source: "system",
        activeBufferTarget: config.leadAssignment.defaultBufferTarget,
        dailyRefillLimit: config.leadAssignment.defaultDailyRefillLimit,
      };
    },

    setScopeDefault(input: {
      scopeType: "branch" | "team";
      scopeId: number;
      activeBufferTarget: number;
      dailyRefillLimit: number;
    }) {
      return repos.leadPolicyDefaults.upsert({
        scope_type: input.scopeType,
        scope_id: input.scopeId,
        active_buffer_target: input.activeBufferTarget,
        daily_refill_limit: input.dailyRefillLimit,
      });
    },

    setUserOverride(input: {
      targetUserId: number;
      activeBufferTarget: number;
      dailyRefillLimit: number;
      setByUserId: number;
      expiresAt: number | null;
    }) {
      return repos.leadPolicyOverrides.replaceForUser({
        user_id: input.targetUserId,
        active_buffer_target: input.activeBufferTarget,
        daily_refill_limit: input.dailyRefillLimit,
        effective_from: Date.now(),
        expires_at: input.expiresAt,
        set_by_user_id: input.setByUserId,
      });
    },
  };
}
