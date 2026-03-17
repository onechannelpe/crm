import type {
  EffectiveSearchPolicy,
  SearchAllowanceSnapshot,
} from "~/server/search-access/contracts";
import type { createAuditService } from "~/server/shared/audit";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { availableAllowance, currentMonthPeriod } from "./domain";
import type { createSearchPolicyService } from "./policy-service";

export type { SearchAllowanceSnapshot } from "~/server/search-access/contracts";

interface SearchAllowanceServiceDeps {
  repos: Repositories;
  policyService: ReturnType<typeof createSearchPolicyService>;
  auditService: ReturnType<typeof createAuditService>;
}

export function createSearchAllowanceService(deps: SearchAllowanceServiceDeps) {
  const { repos, policyService, auditService } = deps;
  type SearchAllowanceLedger = NonNullable<
    Awaited<ReturnType<typeof repos.searchAllowanceLedger.findByUserAndPeriod>>
  >;

  async function logRollbackFailureBestEffort(input: {
    userId: UserId;
    amount: number;
    periodStart: string;
    message: string;
  }): Promise<void> {
    try {
      await auditService.log(
        input.userId,
        "search_usage_rollback_failed",
        "user",
        input.userId,
        {
          amount: input.amount,
          periodStart: input.periodStart,
          message: input.message,
        },
      );
    } catch {
      // Keep rollback paths non-throwing so callers receive typed results.
    }
  }

  async function ensureLedger(userId: UserId): Promise<
    Result<
      {
        ledger: SearchAllowanceLedger;
        policy: EffectiveSearchPolicy;
      },
      DomainError
    >
  > {
    const policyResult = await policyService.getEffectiveSearchPolicy(userId);
    if (isErr(policyResult)) {
      return Err(policyResult.error);
    }

    try {
      const policy = policyResult.value;
      const { periodStart, periodEnd } = currentMonthPeriod();
      let ledger = await repos.searchAllowanceLedger.findByUserAndPeriod(
        userId,
        periodStart,
      );
      if (!ledger) {
        await repos.searchAllowanceLedger.create({
          user_id: userId,
          period_start: periodStart,
          period_end: periodEnd,
          base_limit: policy.monthlySearchLimit,
        });
        ledger = await repos.searchAllowanceLedger.findByUserAndPeriod(
          userId,
          periodStart,
        );
      }
      if (!ledger) {
        return Err(
          domainError(
            "unexpected",
            "ledger_create_failed",
            "Search allowance ledger was not created",
          ),
        );
      }
      if (ledger.base_limit !== policy.monthlySearchLimit) {
        await repos.searchAllowanceLedger.syncBaseLimit(
          ledger.id,
          policy.monthlySearchLimit,
        );
        ledger = {
          ...ledger,
          base_limit: policy.monthlySearchLimit,
        };
      }
      return Ok({ ledger, policy });
    } catch (error) {
      return Err(
        domainError(
          "unexpected",
          "unexpected",
          error instanceof Error
            ? error.message
            : "Failed to ensure search allowance ledger",
        ),
      );
    }
  }

  async function getCurrentSearchAllowance(
    userId: UserId,
  ): Promise<Result<SearchAllowanceSnapshot, DomainError>> {
    const ledgerResult = await ensureLedger(userId);
    if (isErr(ledgerResult)) {
      return Err(ledgerResult.error);
    }
    const { ledger, policy } = ledgerResult.value;
    return Ok({
      periodStart: ledger.period_start,
      periodEnd: ledger.period_end,
      policySource: policy.source,
      monthlySearchLimit: ledger.base_limit,
      extraGranted: ledger.extra_granted,
      usedAmount: ledger.used_amount,
      remaining: availableAllowance({
        baseLimit: ledger.base_limit,
        extraGranted: ledger.extra_granted,
        usedAmount: ledger.used_amount,
      }),
    });
  }

  async function grantExtraSearchAllowance(
    actorUserId: UserId,
    targetUserId: UserId,
    amount: number,
    reason: string,
  ): Promise<Result<SearchAllowanceSnapshot, DomainError>> {
    const ledgerResult = await ensureLedger(targetUserId);
    if (isErr(ledgerResult)) {
      return Err(ledgerResult.error);
    }
    try {
      const { ledger } = ledgerResult.value;
      await repos.searchAllowanceLedger.incrementExtra(ledger.id, amount);
      await auditService.log(
        actorUserId,
        "search_allowance_granted",
        "user",
        targetUserId,
        {
          amount,
          reason,
        },
      );
      return getCurrentSearchAllowance(targetUserId);
    } catch (error) {
      return Err(
        domainError(
          "unexpected",
          "unexpected",
          error instanceof Error
            ? error.message
            : "Failed to grant extra search allowance",
        ),
      );
    }
  }

  return {
    getCurrentSearchAllowance,

    async reserveSearchUsage(
      userId: UserId,
      amount: number = 1,
    ): Promise<Result<void, DomainError>> {
      const ledgerResult = await ensureLedger(userId);
      if (isErr(ledgerResult)) {
        return Err(ledgerResult.error);
      }

      try {
        const { ledger } = ledgerResult.value;
        const reserved =
          await repos.searchAllowanceLedger.reserveUsageIfAvailable(
            ledger.id,
            amount,
          );
        if (!reserved) {
          return Err(
            domainError(
              "conflict",
              "search_exhausted",
              "Monthly search allowance exhausted. Request more searches.",
            ),
          );
        }
        return Ok(undefined);
      } catch (error) {
        return Err(
          domainError(
            "unexpected",
            "unexpected",
            error instanceof Error
              ? error.message
              : "Unexpected search allowance failure",
          ),
        );
      }
    },

    async rollbackSearchUsage(
      userId: UserId,
      amount: number = 1,
    ): Promise<Result<void, DomainError>> {
      const { periodStart } = currentMonthPeriod();
      let ledger: Awaited<
        ReturnType<typeof repos.searchAllowanceLedger.findByUserAndPeriod>
      >;
      try {
        ledger = await repos.searchAllowanceLedger.findByUserAndPeriod(
          userId,
          periodStart,
        );
      } catch (error) {
        await logRollbackFailureBestEffort({
          userId,
          amount,
          periodStart,
          message:
            error instanceof Error
              ? error.message
              : "Unknown rollback ledger lookup failure",
        });
        return Err(
          domainError(
            "unexpected",
            "unexpected",
            error instanceof Error
              ? error.message
              : "Failed to rollback search usage",
          ),
        );
      }
      if (!ledger || ledger.used_amount < amount) {
        await logRollbackFailureBestEffort({
          userId,
          amount,
          periodStart,
          message:
            "Rollback skipped because ledger was missing or insufficient",
        });
        if (!ledger) {
          return Err(
            domainError(
              "not_found",
              "ledger_not_found",
              "Search usage rollback ledger was not found",
            ),
          );
        }
        return Err(
          domainError(
            "conflict",
            "insufficient_usage",
            "Search usage rollback had insufficient reserved usage",
          ),
        );
      }
      try {
        const decremented =
          await repos.searchAllowanceLedger.decrementUsageIfAvailable(
            ledger.id,
            amount,
          );
        if (!decremented) {
          await logRollbackFailureBestEffort({
            userId,
            amount,
            periodStart,
            message: "Rollback decrement skipped due to insufficient usage",
          });
          return Err(
            domainError(
              "conflict",
              "insufficient_usage",
              "Search usage rollback had insufficient reserved usage",
            ),
          );
        }
        return Ok(undefined);
      } catch (error) {
        await logRollbackFailureBestEffort({
          userId,
          amount,
          periodStart,
          message:
            error instanceof Error
              ? error.message
              : "Unknown rollback decrement failure",
        });
        return Err(
          domainError(
            "unexpected",
            "unexpected",
            error instanceof Error
              ? error.message
              : "Failed to rollback search usage",
          ),
        );
      }
    },

    grantExtraSearchAllowance,
  };
}
