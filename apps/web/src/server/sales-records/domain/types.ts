export type SalesRecordSource = "lead_assignment" | "manual";
export type SalesRecordStatus =
  | "draft"
  | "submitted_for_confirmation"
  | "confirmed"
  | "rejected"
  | "cancelled";
export type SalesRecordAttemptOutcome =
  | "no_answer"
  | "callback_scheduled"
  | "validated"
  | "invalid_data"
  | "rejected";
