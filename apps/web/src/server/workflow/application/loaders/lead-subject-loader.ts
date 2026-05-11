import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadRecord } from "../../domain/lead-record";
import type {
  ClosingLeadSubject,
  QualifyingLeadSubject,
  QuotedLeadSubject,
  QuotingLeadSubject,
  ScopingLeadSubject,
} from "../../domain/lead-subjects";
import {
  isClosingLeadSubject,
  isQualifyingLeadSubject,
  isQuotedLeadSubject,
  isQuotingLeadSubject,
  isScopingLeadSubject,
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
  leadId: string,
): Promise<Result<LeadRecord, DomainError>> {
  const lead = await leads.findById(leadId);
  if (!lead) {
    return notFound();
  }

  return Ok(lead);
}

export async function loadQualifyingLead(
  leads: LeadRepository,
  leadId: string,
): Promise<Result<QualifyingLeadSubject, DomainError>> {
  const lead = await loadLeadById(leads, leadId);
  if (!lead.ok) {
    return lead;
  }
  if (!isQualifyingLeadSubject(lead.value)) {
    return invalidStage();
  }
  return Ok(lead.value);
}

export async function loadScopingLead(
  leads: LeadRepository,
  leadId: string,
): Promise<Result<ScopingLeadSubject, DomainError>> {
  const lead = await loadLeadById(leads, leadId);
  if (!lead.ok) {
    return lead;
  }
  if (!isScopingLeadSubject(lead.value)) {
    return invalidStage();
  }
  return Ok(lead.value);
}

export async function loadQuotingLead(
  leads: LeadRepository,
  leadId: string,
): Promise<Result<QuotingLeadSubject, DomainError>> {
  const lead = await loadLeadById(leads, leadId);
  if (!lead.ok) {
    return lead;
  }
  if (!isQuotingLeadSubject(lead.value)) {
    return invalidStage();
  }
  return Ok(lead.value);
}

export async function loadQuotedLead(
  leads: LeadRepository,
  leadId: string,
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

export async function loadClosingLead(
  leads: LeadRepository,
  leadId: string,
): Promise<Result<ClosingLeadSubject, DomainError>> {
  const lead = await loadLeadById(leads, leadId);
  if (!lead.ok) {
    return lead;
  }
  if (!isClosingLeadSubject(lead.value)) {
    return invalidStage();
  }
  return Ok(lead.value);
}
