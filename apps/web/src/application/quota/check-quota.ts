import { QuotaRepository } from "~/infrastructure/db/repositories/quota";
import { todayDateString, getAvailableQuota } from "~/domain/quota/types";
import type { Result } from "~/domain/shared/result";
import { Ok } from "~/domain/shared/result";

export interface QuotaInfo {
  total: number;
  used: number;
  available: number;
  date: string;
}

export async function checkQuota(userId: number): Promise<Result<QuotaInfo | null, Error>> {
  const today = todayDateString();
  const quota = await QuotaRepository.getTodayQuota(userId, today);

  if (!quota) {
    return Ok(null);
  }

  return Ok({
    total: quota.quotaAmount,
    used: quota.usedAmount,
    available: getAvailableQuota(quota),
    date: quota.date,
  });
}
