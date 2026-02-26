import { canConsume, todayDateString } from "~/server/quota/domain";
import { createAuditService } from "~/server/shared/audit";
import type { Repositories } from "~/server/shared/registry";
import { Ok, Err, type Result } from "~/server/shared/result";

export type QuotaServiceError =
  | { reason: "quota_already_allocated"; message: string }
  | { reason: "quota_not_allocated"; message: string }
  | { reason: "quota_exhausted"; message: string }
  | { reason: "invalid_refund_amount"; message: string }
  | { reason: "unexpected"; message: string };

export interface QuotaClock {
  todayDateString(): string;
}

export interface QuotaService {
  allocate(
    supervisorId: number,
    executiveId: number,
    amount: number,
    date?: string,
  ): Promise<Result<void, QuotaServiceError>>;
  consume(
    userId: number,
    amount?: number,
  ): Promise<Result<number, QuotaServiceError>>;
  refund(
    userId: number,
    amount?: number,
  ): Promise<Result<void, QuotaServiceError>>;
  getStatus(userId: number): Promise<
    | { allocated: false }
    | {
        allocated: true;
        total: number;
        used: number;
        remaining: number;
      }
  >;
}

const systemQuotaClock: QuotaClock = {
  todayDateString,
};

export function createQuotaService(
  repos: Repositories,
  clock: QuotaClock = systemQuotaClock,
): QuotaService {
  const audit = createAuditService(repos);
  const today = () => clock.todayDateString();

  function fail(
    reason: QuotaServiceError["reason"],
    message: string,
  ): Result<never, QuotaServiceError> {
    return Err({ reason, message });
  }

  return {
    async allocate(
      supervisorId: number,
      executiveId: number,
      amount: number,
      date: string = today(),
    ): Promise<Result<void, QuotaServiceError>> {
      try {
        const existing = await repos.quotaAllocations.findByUserAndDate(
          executiveId,
          date,
        );
        if (existing) {
          return fail(
            "quota_already_allocated",
            "Quota already allocated for this date",
          );
        }

        await repos.quotaAllocations.create({
          user_id: executiveId,
          allocated_by_user_id: supervisorId,
          date,
          quota_amount: amount,
        });

        await audit.log(
          supervisorId,
          "quota_allocated",
          "quota_allocation",
          executiveId,
          { amount, date },
        );
        return Ok(undefined);
      } catch {
        return fail("unexpected", "Unexpected quota allocation failure");
      }
    },

    async consume(
      userId: number,
      amount: number = 1,
    ): Promise<Result<number, QuotaServiceError>> {
      try {
        const date = today();
        const allocation = await repos.quotaAllocations.findByUserAndDate(
          userId,
          date,
        );

        if (!allocation) {
          return fail(
            "quota_not_allocated",
            "No quota allocated for today. Contact your supervisor.",
          );
        }

        if (!canConsume(allocation, amount)) {
          return fail(
            "quota_exhausted",
            `Quota exhausted: ${allocation.used_amount}/${allocation.quota_amount} used.`,
          );
        }

        await repos.quotaAllocations.incrementUsage(allocation.id, amount);
        return Ok(allocation.quota_amount - allocation.used_amount - amount);
      } catch {
        return fail("unexpected", "Unexpected quota consume failure");
      }
    },

    async refund(
      userId: number,
      amount: number = 1,
    ): Promise<Result<void, QuotaServiceError>> {
      try {
        if (amount <= 0) return Ok(undefined);
        const date = today();
        const allocation = await repos.quotaAllocations.findByUserAndDate(
          userId,
          date,
        );
        if (!allocation) {
          return fail(
            "quota_not_allocated",
            "No quota allocated for today. Contact your supervisor.",
          );
        }
        if (allocation.used_amount < amount) {
          return fail(
            "invalid_refund_amount",
            `Cannot refund ${amount}. Used amount is ${allocation.used_amount}.`,
          );
        }
        await repos.quotaAllocations.decrementUsage(allocation.id, amount);
        return Ok(undefined);
      } catch {
        return fail("unexpected", "Unexpected quota refund failure");
      }
    },

    async getStatus(userId: number) {
      const date = today();
      const allocation = await repos.quotaAllocations.findByUserAndDate(
        userId,
        date,
      );

      if (!allocation) {
        return { allocated: false as const };
      }

      return {
        allocated: true as const,
        total: allocation.quota_amount,
        used: allocation.used_amount,
        remaining: allocation.quota_amount - allocation.used_amount,
      };
    },
  };
}
