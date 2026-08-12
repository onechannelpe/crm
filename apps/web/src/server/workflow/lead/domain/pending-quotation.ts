import { fail, type DomainError } from "~/domain/errors";
import { Err, Ok, type Result } from "~/shared/result";

const MAX_PENDING_QUOTATION_LIMIT = 50;

export const SUGGESTED_PENDING_QUOTATION_LIMIT = 3;

export type PendingQuotationPolicy = {
  limit: number | null;
};

// Missing policy and 0 both disable the cap.
export function resolvePendingQuotationPolicy(input: {
  branchPolicy: { clientLimit: number } | undefined;
}): PendingQuotationPolicy {
  const stored = input.branchPolicy?.clientLimit ?? 0;

  return {
    limit: stored > 0 ? stored : null,
  };
}

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
