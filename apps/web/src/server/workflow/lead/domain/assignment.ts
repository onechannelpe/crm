import { type LeadStage } from "~/contracts/workflow/vocabulary";
import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { Err, Ok, type Result } from "~/shared/result";

export function ensureCanReassignLead(input: {
  currentExecutiveId: UserId;
  newExecutiveId: UserId;
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
