import type { LeadRecord } from "./lead-record";

export type LeadSubjectBase = Omit<LeadRecord, "stage">;

export type QualifyingLeadSubject = LeadSubjectBase & {
  stage: "QUALIFYING";
};

export function isQualifyingLeadSubject(
  lead: LeadRecord,
): lead is QualifyingLeadSubject {
  return lead.stage === "QUALIFYING";
}
