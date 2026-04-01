import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import {
  pipelineAuditService,
  pipelineNotificationCenter,
} from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  ensureLeadCanApproveForSale,
  ensureLeadCanCreateQuotation,
} from "../domain/lead";
import { createLeadPipelineRepos } from "../infrastructure/repos";
import { dispatchLeadNotifications } from "./notifications";

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

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createLeadPipelineRepos(executor);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const canCreate = ensureLeadCanCreateQuotation(lead.stage);
    if (!canCreate.ok) {
      return canCreate;
    }

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
      created_by: input.actorUserId,
    });

    await repos.leads.updateById(input.leadId, {
      stage: "QUOTED",
      updated_at: Date.now(),
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorUserId,
        "quotation_created",
        "lead",
        input.leadId,
        {
          quotationId,
          version,
          to: "QUOTED",
        },
      );
    });

    return Ok({ id: quotationId });
  });
}

export async function approveLeadForSale(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
}): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "quotation:manage")) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createLeadPipelineRepos(executor);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const canApprove = ensureLeadCanApproveForSale(lead.stage);
    if (!canApprove.ok) {
      return canApprove;
    }

    await repos.leads.updateById(input.leadId, {
      stage: "READY_FOR_SALE",
      updated_at: Date.now(),
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorUserId,
        "stage_changed",
        "lead",
        input.leadId,
        {
          from: lead.stage,
          to: "READY_FOR_SALE",
        },
      );
    });
    afterCommit(() =>
      dispatchLeadNotifications(
        [
          {
            type: "lead_ready_for_sale",
            leadId: lead.id,
            executiveId: lead.executive_id,
            ruc: lead.ruc,
          },
        ],
        pipelineNotificationCenter,
      ),
    );

    return Ok(undefined);
  });
}
