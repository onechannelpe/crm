import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadRecord } from "../../domain/lead-record";
import type {
  NeedsExecutiveInputLeadSubject,
  PendingReviewLeadSubject,
  QuotedLeadSubject,
  ReadyForQuotationLeadSubject,
  ReadyForSaleLeadSubject,
} from "../../domain/lead-subjects";
import {
  isNeedsExecutiveInputLeadSubject,
  isPendingReviewLeadSubject,
  isQuotedLeadSubject,
  isReadyForQuotationLeadSubject,
  isReadyForSaleLeadSubject,
} from "../../domain/lead-subjects";
import type { LeadRepository } from "../ports/lead-repository";

function notFound(): Result<never, DomainError> {
  return Err(domainError("not_found", "lead_not_found", "Lead not found"));
}

function invalidStage(): Result<never, DomainError> {
  return Err(
    domainError(
      "validation",
      "invalid_stage",
      "Lead is not in the required stage",
    ),
  );
}

async function loadLeadById(
  leads: LeadRepository,
  leadId: number,
): Promise<Result<LeadRecord, DomainError>> {
  const lead = await leads.findById(leadId);
  if (!lead) {
    return notFound();
  }

  return Ok(lead);
}

export function createLeadSubjectLoader(leads: LeadRepository) {
  return {
    async loadPendingReviewLead(
      leadId: number,
    ): Promise<Result<PendingReviewLeadSubject, DomainError>> {
      const lead = await loadLeadById(leads, leadId);
      if (!lead.ok) {
        return lead;
      }
      if (!isPendingReviewLeadSubject(lead.value)) {
        return invalidStage();
      }
      return Ok(lead.value);
    },

    async loadNeedsExecutiveInputLead(
      leadId: number,
    ): Promise<Result<NeedsExecutiveInputLeadSubject, DomainError>> {
      const lead = await loadLeadById(leads, leadId);
      if (!lead.ok) {
        return lead;
      }
      if (!isNeedsExecutiveInputLeadSubject(lead.value)) {
        return invalidStage();
      }
      return Ok(lead.value);
    },

    async loadReadyForQuotationLead(
      leadId: number,
    ): Promise<Result<ReadyForQuotationLeadSubject, DomainError>> {
      const lead = await loadLeadById(leads, leadId);
      if (!lead.ok) {
        return lead;
      }
      if (!isReadyForQuotationLeadSubject(lead.value)) {
        return invalidStage();
      }
      return Ok(lead.value);
    },

    async loadQuotedLead(
      leadId: number,
    ): Promise<Result<QuotedLeadSubject, DomainError>> {
      const lead = await loadLeadById(leads, leadId);
      if (!lead.ok) {
        return lead;
      }
      if (!isQuotedLeadSubject(lead.value)) {
        return invalidStage();
      }
      return Ok(lead.value);
    },

    async loadReadyForSaleLead(
      leadId: number,
    ): Promise<Result<ReadyForSaleLeadSubject, DomainError>> {
      const lead = await loadLeadById(leads, leadId);
      if (!lead.ok) {
        return lead;
      }
      if (!isReadyForSaleLeadSubject(lead.value)) {
        return invalidStage();
      }
      return Ok(lead.value);
    },
  };
}
