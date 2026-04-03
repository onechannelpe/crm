import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import { ensureCanCreateQuotation } from "../../domain/workflow";
import type { PipelineAuditService } from "../ports/audit-service";
import type { LeadHistoryRepository } from "../ports/history-repository";
import type { LeadRepository } from "../ports/lead-repository";
import type { LeadQuotationRepository } from "../ports/quotation-repository";

type CreateQuotationDeps = {
  leads: LeadRepository;
  leadHistory: LeadHistoryRepository;
  leadQuotations: LeadQuotationRepository;
};

export async function createQuotation(
  deps: CreateQuotationDeps,
  auditService: PipelineAuditService,
  input: {
    actorUserId: number;
    actorRole: Role;
    leadId: number;
    paybackPricing: number;
    tarifaDebito: number;
    tarifaCredito: number;
    tarifaForaneo: number;
    fee: number;
    moneda: "PEN" | "USD";
  },
): Promise<Result<{ id: number }, DomainError>> {
  if (!hasPermission(input.actorRole, "quotation:manage")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const lead = await deps.leads.findById(input.leadId);
  if (!lead) {
    return Err(domainError("not_found", "lead_not_found", "Lead not found"));
  }

  const allowed = ensureCanCreateQuotation(lead.stage);
  if (!allowed.ok) {
    return allowed;
  }

  const version = await deps.leadQuotations.nextVersion(input.leadId);
  const now = Date.now();
  const quotationId = await deps.leadQuotations.insert({
    leadId: input.leadId,
    paybackPricing: input.paybackPricing,
    tarifaDebito: input.tarifaDebito,
    tarifaCredito: input.tarifaCredito,
    tarifaForaneo: input.tarifaForaneo,
    fee: input.fee,
    moneda: input.moneda,
    version,
    createdAt: now,
    createdBy: input.actorUserId,
  });

  await deps.leads.updateById(input.leadId, {
    stage: "QUOTED",
    updatedAt: now,
  });
  await deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.leadId,
      eventType: "quotation_created",
      actorUserId: input.actorUserId,
      payload: { quotationId, version, moneda: input.moneda },
      occurredAt: now,
    }),
  );
  await deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.leadId,
      eventType: "workflow_stage_changed",
      actorUserId: input.actorUserId,
      payload: { from: lead.stage, to: "QUOTED" },
      occurredAt: now,
    }),
  );
  await auditService.log(
    input.actorUserId,
    "quotation_created",
    "lead",
    input.leadId,
    { quotationId, version, to: "QUOTED" },
  );

  return Ok({ id: quotationId });
}
