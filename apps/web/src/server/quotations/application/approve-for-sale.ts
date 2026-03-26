import { dispatchLeadNotifications } from "~/server/leads/application/lead-notification-dispatcher";
import { ensureLeadCanApproveForSale } from "~/server/leads/domain/lead-pipeline";
import { createAuditService } from "~/server/shared/audit";
import type { DomainError } from "~/server/shared/domain-error";
import { domainError } from "~/server/shared/domain-error";
import {
  createPipelineRepos,
  pipelineNotificationCenter,
} from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { type Result, Err, Ok } from "~/server/shared/result";

export async function approveForSaleUseCase(input: {
  leadId: number;
  actorId: number;
}): Promise<Result<void, DomainError>> {
  const result = await runInPipelineTransaction(async (trx) => {
    const repos = createPipelineRepos(trx);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const decision = ensureLeadCanApproveForSale(lead);
    if (!decision.ok) return decision;

    await repos.leads.updateById(input.leadId, {
      stage: "READY_FOR_SALE",
      updated_at: Date.now(),
    });

    const audit = createAuditService({ auditLogs: repos.auditLogs });
    await audit.log(input.actorId, "stage_changed", "lead", input.leadId, {
      from: lead.stage,
      to: "READY_FOR_SALE",
    });

    return Ok(decision.value);
  });

  if (!result.ok) return result;
  await dispatchLeadNotifications(result.value, pipelineNotificationCenter);
  return Ok(undefined);
}
