import { createHistoryEvent } from "../../domain/history";
import type { ReadyForQuotationLeadSubject } from "../../domain/lead-subjects";
import type { CreateQuotationDeps } from "../deps/quotations";
import type { PipelineAuditService } from "../ports/audit-service";

export async function persistLeadQuotationTransition(input: {
  deps: CreateQuotationDeps;
  auditService: PipelineAuditService;
  lead: ReadyForQuotationLeadSubject;
  actorUserId: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: "PEN" | "USD";
  now: number;
}) {
  const version = await input.deps.leadQuotations.nextVersion(input.lead.id);
  const quotationId = await input.deps.leadQuotations.insert({
    leadId: input.lead.id,
    paybackPricing: input.paybackPricing,
    tarifaDebito: input.tarifaDebito,
    tarifaCredito: input.tarifaCredito,
    tarifaForaneo: input.tarifaForaneo,
    fee: input.fee,
    moneda: input.moneda,
    version,
    createdAt: input.now,
    createdBy: input.actorUserId,
  });

  await input.deps.leads.updateById(input.lead.id, {
    stage: "QUOTED",
    updatedAt: input.now,
  });
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.lead.id,
      eventType: "quotation_created",
      actorUserId: input.actorUserId,
      payload: { quotationId, version, moneda: input.moneda },
      occurredAt: input.now,
    }),
  );
  await input.deps.leadHistory.insert(
    createHistoryEvent({
      leadId: input.lead.id,
      eventType: "workflow_stage_changed",
      actorUserId: input.actorUserId,
      payload: { from: input.lead.stage, to: "QUOTED" },
      occurredAt: input.now,
    }),
  );
  await input.auditService.log(
    input.actorUserId,
    "quotation_created",
    "lead",
    input.lead.id,
    { quotationId, version, to: "QUOTED" },
  );

  return quotationId;
}
