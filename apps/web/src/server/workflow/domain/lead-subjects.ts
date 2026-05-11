import type { LeadRecord } from "./lead-record";

export type LeadSubjectBase = Omit<LeadRecord, "stage">;

export type QualifyingLeadSubject = LeadSubjectBase & {
  stage: "QUALIFYING";
};

export type ScopingLeadSubject = LeadSubjectBase & {
  stage: "SCOPING";
};

export type QuotingLeadSubject = LeadSubjectBase & {
  stage: "QUOTING";
};

export type QuotedLeadSubject = LeadSubjectBase & {
  stage: "QUOTED";
};

export type ClosingLeadSubject = LeadSubjectBase & {
  stage: "CLOSING";
};

export function isQualifyingLeadSubject(
  lead: LeadRecord,
): lead is QualifyingLeadSubject {
  return lead.stage === "QUALIFYING";
}

export function isScopingLeadSubject(
  lead: LeadRecord,
): lead is ScopingLeadSubject {
  return lead.stage === "SCOPING";
}

export function isQuotingLeadSubject(
  lead: LeadRecord,
): lead is QuotingLeadSubject {
  return lead.stage === "QUOTING";
}

export function isQuotedLeadSubject(
  lead: LeadRecord,
): lead is QuotedLeadSubject {
  return lead.stage === "QUOTED";
}

export function isClosingLeadSubject(
  lead: LeadRecord,
): lead is ClosingLeadSubject {
  return lead.stage === "CLOSING";
}
