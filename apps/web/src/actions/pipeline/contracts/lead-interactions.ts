export type LeadCallOutcome =
  | "answered"
  | "no_answer"
  | "wrong_number"
  | "callback_requested"
  | "qualified"
  | "disqualified";

export type RecordLeadCallInput = {
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string;
};

export type AddLeadNoteInput = {
  leadId: number;
  body: string;
};
