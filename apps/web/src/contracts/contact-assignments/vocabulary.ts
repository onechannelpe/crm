export type ContactAssignmentStatus = "active" | "completed" | "expired";

export const CONTACT_ASSIGNMENT_CALL_OUTCOMES = [
  "no_answer",
  "callback_scheduled",
  "sale_made",
  "invalid_data",
] as const;

export type ContactAssignmentCallOutcome =
  (typeof CONTACT_ASSIGNMENT_CALL_OUTCOMES)[number];
