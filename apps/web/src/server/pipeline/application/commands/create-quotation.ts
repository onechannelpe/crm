import type { Role } from "~/lib/auth/access/rbac";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { CreateQuotationDeps } from "../deps/quotations";
import { loadReadyForQuotationLead } from "../loaders/lead-subject-loader";
import {
  canCreateQuotation,
  requirePipelineActionAccess,
} from "../policies/access";
import type { PipelineAuditService } from "../ports/audit-service";
import { persistLeadQuotationTransition } from "./create-quotation-effects";

export async function createQuotation(input: {
  deps: CreateQuotationDeps;
  auditService: PipelineAuditService;
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
  const canCreate = requirePipelineActionAccess(
    input.actorRole,
    canCreateQuotation,
  );
  if (!canCreate.ok) {
    return canCreate;
  }

  const lead = await loadReadyForQuotationLead(input.deps.leads, input.leadId);
  if (!lead.ok) {
    return lead;
  }

  const now = Date.now();
  const quotationId = await persistLeadQuotationTransition({
    deps: input.deps,
    auditService: input.auditService,
    lead: lead.value,
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
