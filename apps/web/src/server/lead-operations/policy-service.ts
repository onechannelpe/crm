import { config } from "~/lib/config";
import type { PolicySource, ScopeType } from "~/server/shared/pipeline-types";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

export interface EffectiveLeadPolicy {
  source: PolicySource;
  activeBufferTarget: number;
  dailyRefillLimit: number;
}

type LeadPolicyValue = {
  active_buffer_target: number;
  daily_refill_limit: number;
};

export function resolveEffectiveLeadPolicy(input: {
  userOverride?: LeadPolicyValue | null;
  teamDefault?: LeadPolicyValue | null;
  branchDefault?: LeadPolicyValue | null;
}): EffectiveLeadPolicy {
  if (input.userOverride) {
    return {
      source: "user",
      activeBufferTarget: input.userOverride.active_buffer_target,
      dailyRefillLimit: input.userOverride.daily_refill_limit,
    };
  }

  if (input.teamDefault) {
    return {
      source: "team",
      activeBufferTarget: input.teamDefault.active_buffer_target,
      dailyRefillLimit: input.teamDefault.daily_refill_limit,
    };
  }

  if (input.branchDefault) {
    return {
      source: "branch",
      activeBufferTarget: input.branchDefault.active_buffer_target,
      dailyRefillLimit: input.branchDefault.daily_refill_limit,
    };
  }

  return {
    source: "system",
    activeBufferTarget: config.leadAssignment.defaultBufferTarget,
    dailyRefillLimit: config.leadAssignment.defaultDailyRefillLimit,
  };
}

export type LeadPolicyError =
  | { reason: "user_not_found"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export function createLeadPolicyService(repos: Repositories) {
  return {
    async getEffectiveLeadPolicy(
      userId: number,
    ): Promise<Result<EffectiveLeadPolicy, LeadPolicyError>> {
      try {
        const now = Date.now();
        const user = await repos.users.findById(userId);
        if (!user) {
          return Err({ reason: "user_not_found", message: "User not found" });
        }

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

        return Ok(
          resolveEffectiveLeadPolicy({
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
              : "Failed to resolve lead policy",
        });
      }
    },

    async setScopeDefault(input: {
      scopeType: ScopeType;
      scopeId: number;
      activeBufferTarget: number;
      dailyRefillLimit: number;
    }): Promise<Result<void, LeadPolicyError>> {
      if (input.activeBufferTarget > config.leadAssignment.maxBufferTarget) {
        return Err({
          reason: "validation",
          message: "Buffer target exceeds configured maximum",
        });
      }
      if (input.dailyRefillLimit > config.capacityRequests.maxRequestAmount) {
        return Err({
          reason: "validation",
          message: "Daily refill limit exceeds configured maximum",
        });
      }

      try {
        await repos.leadPolicyDefaults.upsert({
          scope_type: input.scopeType,
          scope_id: input.scopeId,
          active_buffer_target: input.activeBufferTarget,
          daily_refill_limit: input.dailyRefillLimit,
        });
        return Ok(undefined);
      } catch (error) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Failed to set lead scope default",
        });
      }
    },

    async setUserOverride(input: {
      targetUserId: number;
      activeBufferTarget: number;
      dailyRefillLimit: number;
      setByUserId: number;
      expiresAt: number | null;
    }): Promise<Result<void, LeadPolicyError>> {
      if (input.activeBufferTarget > config.leadAssignment.maxBufferTarget) {
        return Err({
          reason: "validation",
          message: "Buffer target exceeds configured maximum",
        });
      }
      if (input.dailyRefillLimit > config.capacityRequests.maxRequestAmount) {
        return Err({
          reason: "validation",
          message: "Daily refill limit exceeds configured maximum",
        });
      }

      try {
        const user = await repos.users.findById(input.targetUserId);
        if (!user) {
          return Err({ reason: "user_not_found", message: "User not found" });
        }

        await repos.leadPolicyOverrides.replaceForUser({
          user_id: input.targetUserId,
          active_buffer_target: input.activeBufferTarget,
          daily_refill_limit: input.dailyRefillLimit,
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
              : "Failed to set lead user override",
        });
      }
    },
  };
}
