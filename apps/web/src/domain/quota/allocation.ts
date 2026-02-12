import type { QuotaAllocation } from "./types";
import { todayDateString } from "./types";

export function createAllocation(
  userId: number,
  supervisorId: number,
  amount: number,
): Omit<QuotaAllocation, "id"> {
  return {
    userId,
    allocatedBySupervisorId: supervisorId,
    date: todayDateString(),
    quotaAmount: amount,
    usedAmount: 0,
    createdAt: Date.now(),
  };
}

export function isValidAllocation(amount: number): boolean {
  return amount > 0 && amount <= 100;
}
