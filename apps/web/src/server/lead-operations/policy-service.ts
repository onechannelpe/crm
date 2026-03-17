import { config } from "~/lib/config";
import type {
  EffectiveLeadPolicy,
  ResolveEffectiveLeadPolicyInput,
  SetLeadScopeDefaultCommand,
  SetLeadUserOverrideCommand,
} from "~/server/lead-operations/contracts";
import type { LeadPolicyError } from "~/server/lead-operations/errors";
import type { UserId } from "~/server/shared/ids";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

export type { EffectiveLeadPolicy } from "~/server/lead-operations/contracts";
export type { LeadPolicyError } from "~/server/lead-operations/errors";

export function resolveEffectiveLeadPolicy(
  input: ResolveEffectiveLeadPolicyInput,
): EffectiveLeadPolicy {
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

export function createLeadPolicyService(repos: Repositories) {
  return {
    async getEffectiveLeadPolicy(
      userId: UserId,
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

    async setScopeDefault(
      input: SetLeadScopeDefaultCommand,
    ): Promise<Result<void, LeadPolicyError>> {
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

    async setUserOverride(
      input: SetLeadUserOverrideCommand,
    ): Promise<Result<void, LeadPolicyError>> {
      try {
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
