import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

// Upper bound for the configurable cap. Keeps the settings input to a sane
// range; the cap exists to force executives to act, not to hold hundreds.
const MAX_PENDING_QUOTATION_LIMIT = 50;

// Value pre-filled in the settings editor when a manager first enables the cap.
// It is only a starting suggestion: the cap is disabled until a branch enables
// it, so this is never enforced on its own.
export const SUGGESTED_PENDING_QUOTATION_LIMIT = 3;

export type PendingQuotationPolicy = {
  // null means the cap is disabled: executives may register without limit.
  limit: number | null;
};

// Resolves the effective cap from the raw per-branch value. The cap is disabled
// by default, so both an absent row and a stored 0 mean "no cap"; a positive
// value is the enforced cap.
export function resolvePendingQuotationPolicy(input: {
  branchPolicy: { clientLimit: number } | undefined;
}): PendingQuotationPolicy {
  const stored = input.branchPolicy?.clientLimit ?? 0;
  return { limit: stored > 0 ? stored : null };
}

// Validates a cap the caller intends to store. 0 is allowed and disables the
// cap; positive values up to the max set an explicit cap.
export function validatePendingQuotationLimit(
  value: number,
): Result<number, DomainError> {
  if (!Number.isInteger(value) || value < 0) {
    return Err(fail("invalid_pending_quotation_limit"));
  }
  if (value > MAX_PENDING_QUOTATION_LIMIT) {
    return Err(fail("pending_quotation_limit_out_of_range"));
  }
  return Ok(value);
}
