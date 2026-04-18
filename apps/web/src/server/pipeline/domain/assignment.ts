import type { LeadStage } from "~/pipeline/contracts/lead-schema";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

function fail(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

export function ensureCanReassignLead(input: {
  currentExecutiveId: UserId;
  newExecutiveId: UserId;
}): Result<void, DomainError> {
  if (input.currentExecutiveId === input.newExecutiveId) {
    return fail(
      "same_executive",
      "Lead is already assigned to the selected executive",
    );
  }

  return Ok(undefined);
}

export function decideRegistrationConflict(input: {
  existingStage: LeadStage;
  hasActiveExecutive: boolean;
}): "reassign_inactive_owner" | "conflict" {
  if (input.existingStage !== "CONVERTED" && !input.hasActiveExecutive) {
    return "reassign_inactive_owner";
  }

  return "conflict";
}
