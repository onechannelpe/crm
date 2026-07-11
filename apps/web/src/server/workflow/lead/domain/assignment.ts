import { type LeadStage } from "~/contracts/workflow/vocabulary";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

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
