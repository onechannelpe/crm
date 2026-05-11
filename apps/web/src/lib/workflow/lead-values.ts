export const LEAD_STAGES = [
  "QUALIFYING",
  "DISQUALIFIED",
  "SCOPING",
  "QUOTING",
  "QUOTED",
  "CLOSING",
  "LIVE",
] as const;

export const LEAD_STATUSES = [
  "DISPONIBLE",
  "SIN RESULTADO",
  "CARTERIZADO",
  "STOCK",
] as const;

export const LEAD_PRIORITIES = ["P1", "P2", "SIN RESULTADO"] as const;

export const LEAD_CALL_OUTCOMES = [
  "answered",
  "no_answer",
  "wrong_number",
  "callback_requested",
  "qualified",
  "disqualified",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type LeadCallOutcome = (typeof LEAD_CALL_OUTCOMES)[number];
