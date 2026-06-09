import { config } from "~/lib/config";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

/**
 * The capacity bounds invariants. The action boundary proves each value is a
 * finite number; these own the policy ceilings and positivity rules, so every
 * use-case that writes an amount or limit enforces them identically. Ceilings
 * live with `config` rather than the database, so they are validated here and
 * nowhere else.
 */

const MIN_EXPIRY_OFFSET_MS = 7 * 24 * 60 * 60 * 1000;

function invalid(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

export function validateRequestAmount(
  amount: number,
): Result<number, DomainError> {
  if (!Number.isInteger(amount) || amount < 1) {
    return invalid("invalid_amount", "Amount must be a positive integer");
  }
  if (amount > config.capacityRequests.maxRequestAmount) {
    return invalid("amount_exceeds_max", "Amount exceeds the maximum allowed");
  }
  return Ok(amount);
}

export function validateSearchLimit(
  monthlyLimit: number,
): Result<number, DomainError> {
  if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0) {
    return invalid(
      "invalid_search_limit",
      "Monthly limit must be greater than zero",
    );
  }
  if (monthlyLimit > config.searchAccess.maxMonthlyLimit) {
    return invalid(
      "search_limit_exceeds_max",
      "Monthly limit exceeds the maximum allowed",
    );
  }
  return Ok(monthlyLimit);
}

export function validateLeadPolicyValues(values: {
  bufferTarget: number;
  dailyLimit: number;
}): Result<{ bufferTarget: number; dailyLimit: number }, DomainError> {
  if (!Number.isFinite(values.bufferTarget) || values.bufferTarget <= 0) {
    return invalid(
      "invalid_buffer_target",
      "Buffer target must be greater than zero",
    );
  }
  if (values.bufferTarget > config.leadAssignment.maxBufferTarget) {
    return invalid(
      "buffer_target_exceeds_max",
      "Buffer target exceeds the maximum allowed",
    );
  }
  if (!Number.isFinite(values.dailyLimit) || values.dailyLimit <= 0) {
    return invalid(
      "invalid_daily_refill",
      "Daily limit must be greater than zero",
    );
  }
  if (values.dailyLimit > config.capacityRequests.maxRequestAmount) {
    return invalid(
      "daily_refill_exceeds_max",
      "Daily limit exceeds the maximum allowed",
    );
  }
  return Ok({
    bufferTarget: values.bufferTarget,
    dailyLimit: values.dailyLimit,
  });
}

export function validateOverrideExpiry(
  expiresAt: number | null,
): Result<number | null, DomainError> {
  if (expiresAt === null) return Ok(null);
  if (!Number.isInteger(expiresAt) || expiresAt < 1) {
    return invalid("invalid_expires_at", "Invalid expiry timestamp");
  }
  if (expiresAt <= Date.now() + MIN_EXPIRY_OFFSET_MS) {
    return invalid(
      "expires_at_too_soon",
      "Expiry must be at least 7 days in the future",
    );
  }
  return Ok(expiresAt);
}
