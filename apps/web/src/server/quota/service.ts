import type { Repositories } from "~/server/shared/registry";
import { createAuditService } from "~/server/shared/audit";
import { canConsume, todayDateString } from "~/server/quota/domain";
import { Ok, Err, type Result } from "~/server/shared/result";

export function createQuotaService(repos: Repositories) {
    const audit = createAuditService(repos);

    return {
        async allocate(
            supervisorId: number,
            executiveId: number,
            amount: number,
            date: string = todayDateString(),
        ): Promise<Result<void, string>> {
            const existing = await repos.quotaAllocations.findByUserAndDate(executiveId, date);
            if (existing) {
                return Err("Quota already allocated for this date");
            }

            await repos.quotaAllocations.create({
                user_id: executiveId,
                allocated_by_user_id: supervisorId,
                date,
                quota_amount: amount,
            });

            await audit.log(supervisorId, "quota_allocated", "quota_allocation", executiveId, { amount, date });
            return Ok(undefined);
        },

        async consume(userId: number, amount: number = 1): Promise<Result<number, string>> {
            const today = todayDateString();
            const allocation = await repos.quotaAllocations.findByUserAndDate(userId, today);

            if (!allocation) {
                return Err("No quota allocated for today. Contact your supervisor.");
            }

            if (!canConsume(allocation, amount)) {
                return Err(`Quota exhausted: ${allocation.used_amount}/${allocation.quota_amount} used.`);
            }

            await repos.quotaAllocations.incrementUsage(allocation.id, amount);
            return Ok(allocation.quota_amount - allocation.used_amount - amount);
        },

        async getStatus(userId: number) {
            const today = todayDateString();
            const allocation = await repos.quotaAllocations.findByUserAndDate(userId, today);

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
