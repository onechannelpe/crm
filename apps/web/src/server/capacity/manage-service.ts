import type { SessionData } from "~/lib/auth/access/session";
import type { createLeadPolicyService } from "~/server/lead-operations/policy-service";
import {
  createLeadRefillService,
  type LeadCapacitySnapshot,
} from "~/server/lead-operations/refill-service";
import {
  createSearchAllowanceService,
  type SearchAllowanceSnapshot,
} from "~/server/search-access/allowance-service";
import type { createSearchPolicyService } from "~/server/search-access/policy-service";
import type { ScopeType } from "~/server/shared/pipeline-types";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { assertCanManageTeam, canManageExecutive } from "./scope";

interface CapacityManageServiceDeps {
  repos: Repositories;
  searchAllowanceService: ReturnType<typeof createSearchAllowanceService>;
  leadRefillService: ReturnType<typeof createLeadRefillService>;
  searchPolicyService: ReturnType<typeof createSearchPolicyService>;
  leadPolicyService: ReturnType<typeof createLeadPolicyService>;
}

export type CapacityManageError =
  | { reason: "not_found"; message: string }
  | { reason: "forbidden"; message: string }
  | { reason: "conflict"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export function createCapacityManageService(deps: CapacityManageServiceDeps) {
  function toUnexpected(error: unknown, fallback: string): CapacityManageError {
    return {
      reason: "unexpected",
      message: error instanceof Error ? error.message : fallback,
    };
  }

  type ManageDomainMappedError =
    | { reason: "user_not_found"; message: string }
    | { reason: "validation"; message: string }
    | { reason: "unexpected"; message: string };

  function mapGrantError(error: ManageDomainMappedError): CapacityManageError {
    switch (error.reason) {
      case "user_not_found":
        return { reason: "not_found", message: error.message };
      case "validation":
        return { reason: "validation", message: error.message };
      case "unexpected":
        return { reason: "unexpected", message: error.message };
    }

    const unreachable: never = error;
    void unreachable;
    return { reason: "unexpected", message: "Unhandled capacity grant error" };
  }

  function mapPolicyMutationError(
    error: ManageDomainMappedError,
  ): CapacityManageError {
    switch (error.reason) {
      case "user_not_found":
        return { reason: "not_found", message: error.message };
      case "validation":
        return { reason: "validation", message: error.message };
      case "unexpected":
        return { reason: "unexpected", message: error.message };
    }

    const unreachable: never = error;
    void unreachable;
    return { reason: "unexpected", message: "Unhandled policy mutation error" };
  }

  async function assertManagedExecutive(
    actor: SessionData,
    targetUserId: number,
  ): Promise<Result<void, CapacityManageError>> {
    const managed = await canManageExecutive(actor, targetUserId, deps.repos);
    if (!managed.ok) {
      return Err({
        reason: "forbidden",
        message: "Cannot manage this executive",
      });
    }

    return Ok(undefined);
  }

  async function assertScopeDefaultAccess(
    actor: SessionData,
    scopeType: ScopeType,
    scopeId: number,
  ): Promise<Result<void, CapacityManageError>> {
    if (scopeType === "branch" && scopeId !== actor.branchId) {
      return Err({
        reason: "conflict",
        message: "Cannot modify defaults outside your branch",
      });
    }

    if (scopeType === "team") {
      const access = await assertCanManageTeam(actor, scopeId, deps.repos);
      if (!access.ok) {
        return Err({
          reason: "forbidden",
          message: "Cannot modify defaults for this team",
        });
      }
    }

    return Ok(undefined);
  }

  return {
    async grantMoreSearches(
      actor: SessionData,
      targetUserId: number,
      amount: number,
      reason: string,
    ): Promise<Result<SearchAllowanceSnapshot, CapacityManageError>> {
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
          return Err(mapGrantError(snapshotResult.error));
        }

        return Ok(snapshotResult.value);
      } catch (error) {
        return Err(toUnexpected(error, "Failed to grant extra searches"));
      }
    },

    async grantMoreLeadRefill(
      actor: SessionData,
      targetUserId: number,
      amount: number,
      reason: string,
    ): Promise<Result<LeadCapacitySnapshot, CapacityManageError>> {
      try {
        const managedResult = await assertManagedExecutive(actor, targetUserId);
        if (isErr(managedResult)) {
          return Err(managedResult.error);
        }

        const snapshotResult =
          await deps.leadRefillService.grantExtraLeadRefill(
            actor.userId,
            targetUserId,
            amount,
            reason,
          );
        if (isErr(snapshotResult)) {
          return Err(mapGrantError(snapshotResult.error));
        }

        return Ok(snapshotResult.value);
      } catch (error) {
        return Err(toUnexpected(error, "Failed to grant extra lead refill"));
      }
    },

    async updateSearchPolicyOverride(
      actor: SessionData,
      input: {
        userId: number;
        monthlySearchLimit: number;
        expiresAt: number | null;
      },
    ): Promise<Result<{ success: true }, CapacityManageError>> {
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
          return Err(mapPolicyMutationError(result.error));
        }

        return Ok({ success: true as const });
      } catch (error) {
        return Err(toUnexpected(error, "Failed to update search policy"));
      }
    },

    async updateLeadPolicyOverride(
      actor: SessionData,
      input: {
        userId: number;
        activeBufferTarget: number;
        dailyRefillLimit: number;
        expiresAt: number | null;
      },
    ): Promise<Result<{ success: true }, CapacityManageError>> {
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
          return Err(mapPolicyMutationError(result.error));
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
        scopeId: number;
        monthlySearchLimit: number;
      },
    ): Promise<Result<{ success: true }, CapacityManageError>> {
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
          return Err(mapPolicyMutationError(result.error));
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
        scopeId: number;
        activeBufferTarget: number;
        dailyRefillLimit: number;
      },
    ): Promise<Result<{ success: true }, CapacityManageError>> {
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
          return Err(mapPolicyMutationError(result.error));
        }

        return Ok({ success: true as const });
      } catch (error) {
        return Err(toUnexpected(error, "Failed to update lead scope default"));
      }
    },
  };
}
