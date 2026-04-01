import type { LeadStage } from "~/lib/db/types";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

function fail(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

export function ensureCanReassignRecord(input: {
  currentExecutiveId: number;
  newExecutiveId: number;
}): Result<void, DomainError> {
  if (input.currentExecutiveId === input.newExecutiveId) {
    return fail(
      "same_executive",
      "Record is already assigned to the selected executive",
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
