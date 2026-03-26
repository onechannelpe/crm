import { ensureLeadCanCreateSale } from "~/server/leads/domain/lead-pipeline";
import { createAuditService } from "~/server/shared/audit";
import type { DomainError } from "~/server/shared/domain-error";
import { domainError } from "~/server/shared/domain-error";
import { createPipelineRepos } from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { type Result, Err, Ok } from "~/server/shared/result";

export async function createSaleUseCase(input: {
  leadId: number;
  executiveId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  banco: string;
  nroCuenta: string;
  cci: string | null;
}): Promise<Result<{ id: number }, DomainError>> {
  return runInPipelineTransaction(async (trx) => {
    const repos = createPipelineRepos(trx);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const canCreate = ensureLeadCanCreateSale({
      lead,
      executiveId: input.executiveId,
      banco: input.banco,
      cci: input.cci,
    });
    if (!canCreate.ok) return canCreate;

    const saleId = await repos.sales.insert({
      lead_id: input.leadId,
      executive_id: input.executiveId,
      proveedor_actual: input.proveedorActual,
      tasa_actual: input.tasaActual,
      gpv: input.gpv,
      ticket: input.ticket,
      abono: input.abono,
      cantidad_pos: input.cantidadPos,
      banco: input.banco,
      nro_cuenta: input.nroCuenta,
      cci: input.cci,
      created_at: Date.now(),
    });

    await repos.leads.updateById(input.leadId, {
      stage: "CONVERTED",
      updated_at: Date.now(),
    });

    const audit = createAuditService({ auditLogs: repos.auditLogs });
    await audit.log(input.executiveId, "sale_created", "lead", input.leadId, {
      saleId,
      to: "CONVERTED",
    });

    return Ok({ id: saleId });
  });
}
