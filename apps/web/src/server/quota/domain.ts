import type { QuotaAllocation } from "~/lib/db/schema";

export function getAvailableQuota(allocation: QuotaAllocation): number {
    return Math.max(0, allocation.quota_amount - allocation.used_amount);
}

export function canConsume(allocation: QuotaAllocation, amount: number): boolean {
    return getAvailableQuota(allocation) >= amount;
}

export function todayDateString(): string {
    return new Date().toISOString().split("T")[0];
}
