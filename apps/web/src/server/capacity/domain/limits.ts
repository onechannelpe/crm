import { config } from "~/lib/config";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

const MIN_EXPIRY_OFFSET_MS = 7 * 24 * 60 * 60 * 1000;

export function validateRequestAmount(
  amount: number,
): Result<number, DomainError> {
  if (!Number.isInteger(amount) || amount < 1) {
    return Err(fail("invalid_amount"));
  }
  if (amount > config.capacityRequests.maxRequestAmount) {
    return Err(fail("amount_exceeds_max"));
  }
  return Ok(amount);
}

export function validateSearchLimit(
  monthlyLimit: number,
): Result<number, DomainError> {
  if (!Number.isInteger(monthlyLimit) || monthlyLimit < 1) {
    return Err(fail("invalid_search_limit"));
  }
  if (monthlyLimit > config.searchAccess.maxMonthlyLimit) {
    return Err(fail("search_limit_exceeds_max"));
  }
  return Ok(monthlyLimit);
}

export function validateLeadPolicyValues(values: {
  bufferTarget: number;
  dailyLimit: number;
}): Result<{ bufferTarget: number; dailyLimit: number }, DomainError> {
  if (!Number.isInteger(values.bufferTarget) || values.bufferTarget < 1) {
    return Err(fail("invalid_buffer_target"));
  }
  if (values.bufferTarget > config.leadAssignment.maxBufferTarget) {
    return Err(fail("buffer_target_exceeds_max"));
  }
  if (!Number.isInteger(values.dailyLimit) || values.dailyLimit < 1) {
    return Err(fail("invalid_daily_refill"));
  }
  if (values.dailyLimit > config.capacityRequests.maxRequestAmount) {
    return Err(fail("daily_refill_exceeds_max"));
  }
  return Ok({
    bufferTarget: values.bufferTarget,
    dailyLimit: values.dailyLimit,
  });
}

export function validateOverrideExpiry(
  expiresAt: number | null,
): Result<Date | null, DomainError> {
  if (expiresAt === null) return Ok(null);
  if (!Number.isInteger(expiresAt) || expiresAt < 1) {
    return Err(fail("invalid_expires_at"));
  }
  if (expiresAt <= Date.now() + MIN_EXPIRY_OFFSET_MS) {
    return Err(fail("expires_at_too_soon"));
  }
  return Ok(new Date(expiresAt));
}
