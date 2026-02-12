import type { QuotaAllocation } from "./types";
import { canConsumeQuota } from "./types";
import { QuotaExceededError } from "../shared/errors";
import type { Result } from "../shared/result";
import { Ok, Err } from "../shared/result";

export function consumeQuota(
  allocation: QuotaAllocation,
  amount: number,
): Result<QuotaAllocation, QuotaExceededError> {
  if (!canConsumeQuota(allocation, amount)) {
    return Err(
      new QuotaExceededError(
        allocation.usedAmount,
        allocation.quotaAmount,
      ),
    );
  }

  return Ok({
    ...allocation,
    usedAmount: allocation.usedAmount + amount,
  });
}
