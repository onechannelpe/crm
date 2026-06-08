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
    return invalid("invalid_amount", "El monto debe ser un entero positivo.");
  }
  if (amount > config.capacityRequests.maxRequestAmount) {
    return invalid(
      "amount_exceeds_max",
      "El monto supera el máximo permitido.",
    );
  }
  return Ok(amount);
}

export function validateSearchLimit(
  monthlyLimit: number,
): Result<number, DomainError> {
  if (!Number.isFinite(monthlyLimit) || monthlyLimit <= 0) {
    return invalid(
      "invalid_search_limit",
      "El límite mensual debe ser mayor que cero.",
    );
  }
  if (monthlyLimit > config.searchAccess.maxMonthlyLimit) {
    return invalid(
      "search_limit_exceeds_max",
      "El límite mensual supera el máximo permitido.",
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
      "El objetivo de buffer debe ser mayor que cero.",
    );
  }
  if (values.bufferTarget > config.leadAssignment.maxBufferTarget) {
    return invalid(
      "buffer_target_exceeds_max",
      "El objetivo de buffer supera el máximo permitido.",
    );
  }
  if (!Number.isFinite(values.dailyLimit) || values.dailyLimit <= 0) {
    return invalid(
      "invalid_daily_refill",
      "El límite diario debe ser mayor que cero.",
    );
  }
  if (values.dailyLimit > config.capacityRequests.maxRequestAmount) {
    return invalid(
      "daily_refill_exceeds_max",
      "El límite diario supera el máximo permitido.",
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
    return invalid("invalid_expires_at", "La fecha de expiración es inválida.");
  }
  if (expiresAt <= Date.now() + MIN_EXPIRY_OFFSET_MS) {
    return invalid(
      "expires_at_too_soon",
      "La expiración debe ser al menos 7 días en el futuro.",
    );
  }
  return Ok(expiresAt);
}
