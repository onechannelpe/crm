import { createAuditService } from "~/server/shared/audit";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import { availableAllowance, currentMonthPeriod } from "./domain";
import { createSearchPolicyService } from "./policy-service";

export type SearchAccessError =
  | { reason: "search_exhausted"; message: string }
  | { reason: "unexpected"; message: string };

export function createSearchAccessService(repos: Repositories) {
  const policyService = createSearchPolicyService(repos);
  const audit = createAuditService(repos);

  async function ensureLedger(userId: number) {
    const policy = await policyService.getEffectivePolicy(userId);
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
      throw new Error("Search allowance ledger was not created");
    }
    if (ledger.base_limit !== policy.monthlySearchLimit) {
      await repos.searchAllowanceLedger.syncBaseLimit(
        ledger.id,
        policy.monthlySearchLimit,
      );
      ledger = await repos.searchAllowanceLedger.findByUserAndPeriod(
        userId,
        periodStart,
      );
    }
    if (!ledger) {
      throw new Error("Search allowance ledger was not reloaded");
    }
    return { policy, ledger };
  }

  return {
    async getStatus(userId: number) {
      const { policy, ledger } = await ensureLedger(userId);
      return {
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
      };
    },

    async consumeSearch(
      userId: number,
      amount: number = 1,
    ): Promise<Result<void, SearchAccessError>> {
      try {
        const { ledger } = await ensureLedger(userId);
        const remaining = availableAllowance({
          baseLimit: ledger.base_limit,
          extraGranted: ledger.extra_granted,
          usedAmount: ledger.used_amount,
        });
        if (remaining < amount) {
          return Err({
            reason: "search_exhausted",
            message: "Monthly search allowance exhausted. Request more searches.",
          });
        }
        await repos.searchAllowanceLedger.incrementUsage(ledger.id, amount);
        return Ok(undefined);
      } catch {
        return Err({
          reason: "unexpected",
          message: "Unexpected search allowance failure",
        });
      }
    },

    async refundSearch(userId: number, amount: number = 1) {
      const { periodStart } = currentMonthPeriod();
      const ledger = await repos.searchAllowanceLedger.findByUserAndPeriod(
        userId,
        periodStart,
      );
      if (!ledger || ledger.used_amount < amount) {
        return;
      }
      await repos.searchAllowanceLedger.decrementUsage(ledger.id, amount);
    },

    async grantExtraAllowance(
      actorUserId: number,
      targetUserId: number,
      amount: number,
      reason: string,
    ) {
      const { ledger } = await ensureLedger(targetUserId);
      await repos.searchAllowanceLedger.incrementExtra(ledger.id, amount);
      await audit.log(actorUserId, "search_allowance_granted", "user", targetUserId, {
        amount,
        reason,
      });
      return this.getStatus(targetUserId);
    },
  };
}
