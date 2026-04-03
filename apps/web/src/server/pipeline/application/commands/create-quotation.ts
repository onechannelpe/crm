import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { ensureCanCreateQuotation } from "../../domain/workflow";
import type { CreateQuotationDeps } from "../deps/quotations";
import type { PipelineAuditService } from "../ports/audit-service";
import { writeLeadQuotation } from "./create-quotation-writer";

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

  const now = Date.now();
  const quotationId = await writeLeadQuotation({
    deps,
    auditService,
    lead,
    actorUserId: input.actorUserId,
    paybackPricing: input.paybackPricing,
    tarifaDebito: input.tarifaDebito,
    tarifaCredito: input.tarifaCredito,
    tarifaForaneo: input.tarifaForaneo,
    fee: input.fee,
    moneda: input.moneda,
    now,
  });

  return Ok({ id: quotationId });
}
