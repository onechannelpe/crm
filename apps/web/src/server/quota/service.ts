import { canConsume, todayDateString } from "~/server/quota/domain";
import { createAuditService } from "~/server/shared/audit";
import type { Repositories } from "~/server/shared/registry";
import { Ok, Err, type Result } from "~/server/shared/result";

export interface QuotaClock {
  todayDateString(): string;
}

export interface QuotaService {
  allocate(
    supervisorId: number,
    executiveId: number,
    amount: number,
    date?: string,
  ): Promise<Result<void, string>>;
  consume(userId: number, amount?: number): Promise<Result<number, string>>;
  refund(userId: number, amount?: number): Promise<Result<void, string>>;
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

  return {
    async allocate(
      supervisorId: number,
      executiveId: number,
      amount: number,
      date: string = today(),
    ): Promise<Result<void, string>> {
      const existing = await repos.quotaAllocations.findByUserAndDate(
        executiveId,
        date,
      );
      if (existing) {
        return Err("Quota already allocated for this date");
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
    },

    async consume(
      userId: number,
      amount: number = 1,
    ): Promise<Result<number, string>> {
      const date = today();
      const allocation = await repos.quotaAllocations.findByUserAndDate(
        userId,
        date,
      );

      if (!allocation) {
        return Err("No quota allocated for today. Contact your supervisor.");
      }

      if (!canConsume(allocation, amount)) {
        return Err(
          `Quota exhausted: ${allocation.used_amount}/${allocation.quota_amount} used.`,
        );
      }

      await repos.quotaAllocations.incrementUsage(allocation.id, amount);
      return Ok(allocation.quota_amount - allocation.used_amount - amount);
    },

    async refund(
      userId: number,
      amount: number = 1,
    ): Promise<Result<void, string>> {
      if (amount <= 0) return Ok(undefined);
      const date = today();
      const allocation = await repos.quotaAllocations.findByUserAndDate(
        userId,
        date,
      );
      if (!allocation) {
        return Err("No quota allocated for today. Contact your supervisor.");
      }
      if (allocation.used_amount < amount) {
        return Err(
          `Cannot refund ${amount}. Used amount is ${allocation.used_amount}.`,
        );
      }
      await repos.quotaAllocations.decrementUsage(allocation.id, amount);
      return Ok(undefined);
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
