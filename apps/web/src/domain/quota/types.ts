export interface QuotaAllocation {
  id: number;
  userId: number;
  allocatedBySupervisorId: number;
  date: string;
  quotaAmount: number;
  usedAmount: number;
  createdAt: number;
}

export function getAvailableQuota(allocation: QuotaAllocation): number {
  return Math.max(0, allocation.quotaAmount - allocation.usedAmount);
}

export function canConsumeQuota(allocation: QuotaAllocation, amount: number): boolean {
  return getAvailableQuota(allocation) >= amount;
}

export function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}
