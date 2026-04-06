export const LEAD_CALL_OUTCOMES = [
  "answered",
  "no_answer",
  "wrong_number",
  "callback_requested",
  "qualified",
  "disqualified",
] as const;

export type LeadCallOutcome = (typeof LEAD_CALL_OUTCOMES)[number];
