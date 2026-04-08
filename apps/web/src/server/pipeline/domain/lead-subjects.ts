import type { LeadRecord } from "./lead-record";

export type LeadSubjectBase = Omit<LeadRecord, "stage">;

export type PendingReviewLeadSubject = LeadSubjectBase & {
  stage: "PENDING_EXTERNAL_REVIEW";
};

export type NeedsExecutiveInputLeadSubject = LeadSubjectBase & {
  stage: "NEEDS_EXECUTIVE_INPUT";
};

export type ReadyForQuotationLeadSubject = LeadSubjectBase & {
  stage: "READY_FOR_QUOTATION";
};

export type QuotedLeadSubject = LeadSubjectBase & {
  stage: "QUOTED";
};

export type ReadyForSaleLeadSubject = LeadSubjectBase & {
  stage: "READY_FOR_SALE";
};

export function isPendingReviewLeadSubject(
  lead: LeadRecord,
): lead is PendingReviewLeadSubject {
  return lead.stage === "PENDING_EXTERNAL_REVIEW";
}

export function isNeedsExecutiveInputLeadSubject(
  lead: LeadRecord,
): lead is NeedsExecutiveInputLeadSubject {
  return lead.stage === "NEEDS_EXECUTIVE_INPUT";
}

export function isReadyForQuotationLeadSubject(
  lead: LeadRecord,
): lead is ReadyForQuotationLeadSubject {
  return lead.stage === "READY_FOR_QUOTATION";
}

export function isQuotedLeadSubject(
  lead: LeadRecord,
): lead is QuotedLeadSubject {
  return lead.stage === "QUOTED";
}

export function isReadyForSaleLeadSubject(
  lead: LeadRecord,
): lead is ReadyForSaleLeadSubject {
  return lead.stage === "READY_FOR_SALE";
}
