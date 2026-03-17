import type { SessionData } from "~/lib/auth/access/session";
import type { createLeadPolicyService } from "~/server/lead-operations/policy-service";
import {
  createLeadRefillGrantService,
  type LeadCapacitySnapshot,
} from "~/server/lead-operations/refill-service";
import {
  createSearchAllowanceService,
  type SearchAllowanceSnapshot,
} from "~/server/search-access/allowance-service";
import type { createSearchPolicyService } from "~/server/search-access/policy-service";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { asTeamId } from "~/server/shared/ids";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import type { ScopeType } from "~/server/shared/pipeline-types";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { assertCanManageTeam, canManageExecutive } from "./scope";

interface CapacityManageServiceDeps {
  repos: Repositories;
  searchAllowanceService: ReturnType<typeof createSearchAllowanceService>;
  leadRefillGrantService: ReturnType<typeof createLeadRefillGrantService>;
  searchPolicyService: ReturnType<typeof createSearchPolicyService>;
  leadPolicyService: ReturnType<typeof createLeadPolicyService>;
}

export function createCapacityManageService(deps: CapacityManageServiceDeps) {
  function toUnexpected(error: unknown, fallback: string): DomainError {
    return domainError(
      "unexpected",
      "unexpected",
      error instanceof Error ? error.message : fallback,
    );
  }

  async function assertManagedExecutive(
    actor: SessionData,
    targetUserId: UserId,
  ): Promise<Result<void, DomainError>> {
    const managed = await canManageExecutive(actor, targetUserId, deps.repos);
    if (!managed.target) {
      return Err(
        domainError("not_found", "executive_not_found", "Executive not found"),
      );
    }

    if (!managed.ok) {
      return Err(
        domainError(
          "forbidden",
          "cannot_manage_executive",
          "Cannot manage this executive",
        ),
      );
    }

    return Ok(undefined);
  }

  async function assertScopeDefaultAccess(
    actor: SessionData,
    scopeType: ScopeType,
    scopeId: BranchId | TeamId,
  ): Promise<Result<void, DomainError>> {
    if (actor.role === "superuser") {
      return Ok(undefined);
    }

    if (scopeType === "branch" && scopeId !== actor.branchId) {
      return Err(
        domainError(
          "conflict",
          "scope_conflict",
          "Cannot modify defaults outside your branch",
        ),
      );
    }

    if (scopeType === "team") {
      const access = await assertCanManageTeam(
        actor,
        asTeamId(scopeId),
        deps.repos,
      );
      if (!access.ok) {
        return Err(
          domainError(
            "forbidden",
            "cannot_manage_team_defaults",
            "Cannot modify defaults for this team",
          ),
        );
      }
    }

    return Ok(undefined);
  }

  return {
    async grantMoreSearches(
      actor: SessionData,
      targetUserId: UserId,
      amount: number,
      reason: string,
    ): Promise<Result<SearchAllowanceSnapshot, DomainError>> {
      try {
        const managedResult = await assertManagedExecutive(actor, targetUserId);
        if (isErr(managedResult)) {
          return Err(managedResult.error);
        }

        const snapshotResult =
          await deps.searchAllowanceService.grantExtraSearchAllowance(
            actor.userId,
            targetUserId,
            amount,
            reason,
          );
        if (isErr(snapshotResult)) {
          return Err(snapshotResult.error);
        }

        return Ok(snapshotResult.value);
      } catch (error) {
        return Err(toUnexpected(error, "Failed to grant extra searches"));
      }
    },

    async grantMoreLeadRefill(
      actor: SessionData,
      targetUserId: UserId,
      amount: number,
      reason: string,
    ): Promise<Result<LeadCapacitySnapshot, DomainError>> {
      try {
        const managedResult = await assertManagedExecutive(actor, targetUserId);
        if (isErr(managedResult)) {
          return Err(managedResult.error);
        }

        const snapshotResult =
          await deps.leadRefillGrantService.grantExtraLeadRefill(
            actor.userId,
            targetUserId,
            amount,
            reason,
          );
        if (isErr(snapshotResult)) {
          return Err(snapshotResult.error);
        }

        return Ok(snapshotResult.value);
      } catch (error) {
        return Err(toUnexpected(error, "Failed to grant extra lead refill"));
      }
    },

    async updateSearchPolicyOverride(
      actor: SessionData,
      input: {
        userId: UserId;
        monthlySearchLimit: number;
        expiresAt: number | null;
      },
    ): Promise<Result<{ success: true }, DomainError>> {
      try {
        const managedResult = await assertManagedExecutive(actor, input.userId);
        if (isErr(managedResult)) {
          return Err(managedResult.error);
        }

        const result = await deps.searchPolicyService.setUserOverride({
          targetUserId: input.userId,
          monthlySearchLimit: input.monthlySearchLimit,
          setByUserId: actor.userId,
          expiresAt: input.expiresAt,
        });
        if (isErr(result)) {
          return Err(result.error);
        }

        return Ok({ success: true as const });
      } catch (error) {
        return Err(toUnexpected(error, "Failed to update search policy"));
      }
    },

    async updateLeadPolicyOverride(
      actor: SessionData,
      input: {
        userId: UserId;
        activeBufferTarget: number;
        dailyRefillLimit: number;
        expiresAt: number | null;
      },
    ): Promise<Result<{ success: true }, DomainError>> {
      try {
        const managedResult = await assertManagedExecutive(actor, input.userId);
        if (isErr(managedResult)) {
          return Err(managedResult.error);
        }

        const result = await deps.leadPolicyService.setUserOverride({
          targetUserId: input.userId,
          activeBufferTarget: input.activeBufferTarget,
          dailyRefillLimit: input.dailyRefillLimit,
          setByUserId: actor.userId,
          expiresAt: input.expiresAt,
        });
        if (isErr(result)) {
          return Err(result.error);
        }

        return Ok({ success: true as const });
      } catch (error) {
        return Err(toUnexpected(error, "Failed to update lead policy"));
      }
    },

    async updateSearchScopeDefault(
      actor: SessionData,
      input: {
        scopeType: ScopeType;
        scopeId: BranchId | TeamId;
        monthlySearchLimit: number;
      },
    ): Promise<Result<{ success: true }, DomainError>> {
      try {
        const accessResult = await assertScopeDefaultAccess(
          actor,
          input.scopeType,
          input.scopeId,
        );
        if (isErr(accessResult)) {
          return Err(accessResult.error);
        }

        const result = await deps.searchPolicyService.setScopeDefault({
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          monthlySearchLimit: input.monthlySearchLimit,
        });
        if (isErr(result)) {
          return Err(result.error);
        }

        return Ok({ success: true as const });
      } catch (error) {
        return Err(
          toUnexpected(error, "Failed to update search scope default"),
        );
      }
    },

    async updateLeadScopeDefault(
      actor: SessionData,
      input: {
        scopeType: ScopeType;
        scopeId: BranchId | TeamId;
        activeBufferTarget: number;
        dailyRefillLimit: number;
      },
    ): Promise<Result<{ success: true }, DomainError>> {
      try {
        const accessResult = await assertScopeDefaultAccess(
          actor,
          input.scopeType,
          input.scopeId,
        );
        if (isErr(accessResult)) {
          return Err(accessResult.error);
        }

        const result = await deps.leadPolicyService.setScopeDefault({
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          activeBufferTarget: input.activeBufferTarget,
          dailyRefillLimit: input.dailyRefillLimit,
        });
        if (isErr(result)) {
          return Err(result.error);
        }

        return Ok({ success: true as const });
      } catch (error) {
        return Err(toUnexpected(error, "Failed to update lead scope default"));
      }
    },
  };
}
