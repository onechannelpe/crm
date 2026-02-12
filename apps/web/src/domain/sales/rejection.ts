import type { Rejection } from "./types";

export interface RejectionInput {
  chargeNoteId: number;
  reviewerId: number;
  fieldId: string;
  reviewerNote: string;
}

export function createRejection(
  input: RejectionInput,
): Omit<Rejection, "id"> {
  return {
    chargeNoteId: input.chargeNoteId,
    reviewerId: input.reviewerId,
    fieldId: input.fieldId,
    reviewerNote: input.reviewerNote,
    isResolved: false,
    createdAt: Date.now(),
  };
}

export function resolveRejection(rejection: Rejection): Rejection {
  return {
    ...rejection,
    isResolved: true,
  };
}
