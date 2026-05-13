import type { LeadStage } from "~/contracts/workflow/vocabulary";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

function fail(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

export function ensureCanReassignLead(input: {
  currentExecutiveId: number;
  newExecutiveId: number;
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
  if (input.existingStage !== "LIVE" && !input.hasActiveExecutive) {
    return "reassign_inactive_owner";
  }

  return "conflict";
}
