import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { pipelineAuditService } from "~/server/pipeline/infrastructure/deps";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import { ensureCanCreateQuotation } from "../../domain/workflow";
import { createPipelineDeps } from "../../infrastructure/deps";

export async function createQuotation(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: "PEN" | "USD";
}): Promise<Result<{ id: number }, DomainError>> {
  if (!hasPermission(input.actorRole, "quotation:manage")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createPipelineDeps(executor);
    const record = await deps.records.findById(input.leadId);
    if (!record) {
      return Err(
        domainError("not_found", "record_not_found", "Record not found"),
      );
    }

    const allowed = ensureCanCreateQuotation(record.stage);
    if (!allowed.ok) {
      return allowed;
    }

    const version = await deps.quotations.nextVersion(input.leadId);
    const quotationId = await deps.quotations.insert({
      lead_id: input.leadId,
      payback_pricing: input.paybackPricing,
      tarifa_debito: input.tarifaDebito,
      tarifa_credito: input.tarifaCredito,
      tarifa_foraneo: input.tarifaForaneo,
      fee: input.fee,
      moneda: input.moneda,
      version,
      created_at: Date.now(),
      created_by: input.actorUserId,
    });

    const now = Date.now();
    await deps.records.updateById(input.leadId, {
      stage: "QUOTED",
      updated_at: now,
    });
    await deps.history.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "quotation_created",
        actorUserId: input.actorUserId,
        payload: { quotationId, version, moneda: input.moneda },
        occurredAt: now,
      }),
    );
    await deps.history.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "workflow_stage_changed",
        actorUserId: input.actorUserId,
        payload: { from: record.stage, to: "QUOTED" },
        occurredAt: now,
      }),
    );
    await pipelineAuditService.log(
      input.actorUserId,
      "quotation_created",
      "lead",
      input.leadId,
      { quotationId, version, to: "QUOTED" },
    );

    return Ok({ id: quotationId });
  });
}
