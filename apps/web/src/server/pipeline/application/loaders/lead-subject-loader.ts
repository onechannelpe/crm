import type { LeadId } from "~/server/pipeline/domain/lead-record";
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
  leadId: LeadId,
): Promise<Result<LeadRecord, DomainError>> {
  const lead = await leads.findById(leadId);
  if (!lead) {
    return notFound();
  }

  return Ok(lead);
}

export async function loadPendingReviewLead(
  leads: LeadRepository,
  leadId: LeadId,
): Promise<Result<PendingReviewLeadSubject, DomainError>> {
  const lead = await loadLeadById(leads, leadId);
  if (!lead.ok) {
    return lead;
  }
  if (!isPendingReviewLeadSubject(lead.value)) {
    return invalidStage();
  }
  return Ok(lead.value);
}

export async function loadNeedsExecutiveInputLead(
  leads: LeadRepository,
  leadId: LeadId,
): Promise<Result<NeedsExecutiveInputLeadSubject, DomainError>> {
  const lead = await loadLeadById(leads, leadId);
  if (!lead.ok) {
    return lead;
  }
  if (!isNeedsExecutiveInputLeadSubject(lead.value)) {
    return invalidStage();
  }
  return Ok(lead.value);
}

export async function loadReadyForQuotationLead(
  leads: LeadRepository,
  leadId: LeadId,
): Promise<Result<ReadyForQuotationLeadSubject, DomainError>> {
  const lead = await loadLeadById(leads, leadId);
  if (!lead.ok) {
    return lead;
  }
  if (!isReadyForQuotationLeadSubject(lead.value)) {
    return invalidStage();
  }
  return Ok(lead.value);
}

export async function loadQuotedLead(
  leads: LeadRepository,
  leadId: LeadId,
): Promise<Result<QuotedLeadSubject, DomainError>> {
  const lead = await loadLeadById(leads, leadId);
  if (!lead.ok) {
    return lead;
  }
  if (!isQuotedLeadSubject(lead.value)) {
    return invalidStage();
  }
  return Ok(lead.value);
}

export async function loadReadyForSaleLead(
  leads: LeadRepository,
  leadId: LeadId,
): Promise<Result<ReadyForSaleLeadSubject, DomainError>> {
  const lead = await loadLeadById(leads, leadId);
  if (!lead.ok) {
    return lead;
  }
  if (!isReadyForSaleLeadSubject(lead.value)) {
    return invalidStage();
  }
  return Ok(lead.value);
}
