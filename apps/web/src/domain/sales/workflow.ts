import type { ChargeNoteStatus } from "./types";
import { InvalidTransitionError } from "../shared/errors";
import type { Result } from "../shared/result";
import { Ok, Err } from "../shared/result";

const VALID_TRANSITIONS: Record<ChargeNoteStatus, ChargeNoteStatus[]> = {
  Draft: ["Pending_Back"],
  Pending_Back: ["Approved", "Rejected"],
  Rejected: ["Pending_Back"],
  Approved: [],
};

export function canTransition(
  from: ChargeNoteStatus,
  to: ChargeNoteStatus,
): Result<void, InvalidTransitionError> {
  const allowed = VALID_TRANSITIONS[from];
  
  if (!allowed.includes(to)) {
    return Err(new InvalidTransitionError(from, to));
  }
  
  return Ok(undefined);
}

export function isDraft(status: ChargeNoteStatus): boolean {
  return status === "Draft";
}

export function isRejected(status: ChargeNoteStatus): boolean {
  return status === "Rejected";
}
