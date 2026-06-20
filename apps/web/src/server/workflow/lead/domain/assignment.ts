import { type LeadStage } from "~/contracts/workflow/vocabulary";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export function ensureCanReassignLead(input: {
  currentExecutiveId: number;
  newExecutiveId: number;
}): Result<void, DomainError> {
  if (input.currentExecutiveId === input.newExecutiveId) {
    return Err(fail("same_executive"));
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
