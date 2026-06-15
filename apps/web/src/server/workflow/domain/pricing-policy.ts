import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export const DEFAULT_RATE_PROPOSAL_VALIDITY_DAYS = 7;
const MIN_RATE_PROPOSAL_VALIDITY_DAYS = 1;
const MAX_RATE_PROPOSAL_VALIDITY_DAYS = 90;

export type RateProposalPolicy = {
  validityDays: number;
};

export function validateRateProposalValidityDays(
  value: number,
): Result<number, DomainError> {
  if (!Number.isInteger(value)) {
    return Err(fail("invalid_rate_proposal_validity_days"));
  }
  if (
    value < MIN_RATE_PROPOSAL_VALIDITY_DAYS ||
    value > MAX_RATE_PROPOSAL_VALIDITY_DAYS
  ) {
    return Err(fail("rate_proposal_validity_days_out_of_range"));
  }
  return Ok(value);
}

export function resolveRateProposalPolicy(input: {
  branchPolicy: { validityDays: number } | undefined;
}): RateProposalPolicy {
  return {
    validityDays:
      input.branchPolicy?.validityDays ?? DEFAULT_RATE_PROPOSAL_VALIDITY_DAYS,
  };
}
