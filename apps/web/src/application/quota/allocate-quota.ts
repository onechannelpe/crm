import { QuotaRepository } from "~/infrastructure/db/repositories/quota";
import { AuditRepository } from "~/infrastructure/db/repositories/audit";
import { createAllocation, isValidAllocation } from "~/domain/quota/allocation";
import { todayDateString } from "~/domain/quota/types";
import type { Result } from "~/domain/shared/result";
import { Ok, Err } from "~/domain/shared/result";

interface AllocateQuotaInput {
  userId: number;
  supervisorId: number;
  amount: number;
}

export async function allocateQuota(
  input: AllocateQuotaInput,
): Promise<Result<number, Error>> {
  if (!isValidAllocation(input.amount)) {
    return Err(new Error("Invalid quota amount (must be 1-100)"));
  }

  const today = todayDateString();
  const existing = await QuotaRepository.getTodayQuota(input.userId, today);

  if (existing) {
    return Err(new Error("Quota already allocated for today"));
  }

  const allocation = createAllocation(
    input.userId,
    input.supervisorId,
    input.amount,
  );

  const quotaId = await QuotaRepository.create(allocation);

  await AuditRepository.log({
    userId: input.supervisorId,
    action: "allocate_quota",
    entityType: "quota_allocation",
    entityId: quotaId,
    changes: JSON.stringify({ amount: input.amount }),
    createdAt: Date.now(),
  });

  return Ok(quotaId);
}
