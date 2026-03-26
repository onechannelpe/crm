import { ensureLeadCanCreateQuotation } from "~/server/leads/domain/lead-pipeline";
import { createAuditService } from "~/server/shared/audit";
import type { DomainError } from "~/server/shared/domain-error";
import { domainError } from "~/server/shared/domain-error";
import { createPipelineRepos } from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { type Result, Err, Ok } from "~/server/shared/result";

export async function createQuotationUseCase(input: {
  leadId: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: "PEN" | "USD";
  actorId: number;
}): Promise<Result<{ id: number }, DomainError>> {
  return runInPipelineTransaction(async (trx) => {
    const repos = createPipelineRepos(trx);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const canCreate = ensureLeadCanCreateQuotation(lead);
    if (!canCreate.ok) return canCreate;

    const version = await repos.quotations.nextVersion(input.leadId);
    const quotationId = await repos.quotations.insert({
      lead_id: input.leadId,
      payback_pricing: input.paybackPricing,
      tarifa_debito: input.tarifaDebito,
      tarifa_credito: input.tarifaCredito,
      tarifa_foraneo: input.tarifaForaneo,
      fee: input.fee,
      moneda: input.moneda,
      version,
      created_at: Date.now(),
      created_by: input.actorId,
    });

    await repos.leads.updateById(input.leadId, {
      stage: "QUOTED",
      updated_at: Date.now(),
    });

    const audit = createAuditService({ auditLogs: repos.auditLogs });
    await audit.log(input.actorId, "quotation_created", "lead", input.leadId, {
      quotationId,
      version,
      to: "QUOTED",
    });

    return Ok({ id: quotationId });
  });
}
