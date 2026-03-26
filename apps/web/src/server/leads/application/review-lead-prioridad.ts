import { createAuditService } from "~/server/shared/audit";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import {
  createPipelineRepos,
  pipelineNotificationCenter,
} from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { type Result, Err, Ok } from "~/server/shared/result";

import { applyPrioridadReview } from "../domain/lead-pipeline";
import { dispatchLeadNotifications } from "./lead-notification-dispatcher";

export async function reviewLeadPrioridadUseCase(input: {
  leadId: number;
  prioridad: import("~/lib/db/types").Prioridad;
  reason: string;
  actorId: number;
  branchId: number;
}): Promise<Result<void, DomainError>> {
  const result = await runInPipelineTransaction(async (trx) => {
    const repos = createPipelineRepos(trx);
    const lead = await repos.leads.findById(input.leadId);
    if (!lead) {
      return Err(domainError("not_found", "lead_not_found", "Lead not found"));
    }

    const decision = applyPrioridadReview({
      lead,
      prioridad: input.prioridad,
      branchId: input.branchId,
    });
    if (!decision.ok) return decision;

    await repos.leads.updateById(input.leadId, {
      prioridad: input.prioridad,
      stage: decision.value.nextStage ?? undefined,
      updated_at: Date.now(),
    });

    const audit = createAuditService({ auditLogs: repos.auditLogs });
    await audit.log(input.actorId, "prioridad_changed", "lead", input.leadId, {
      from: lead.prioridad,
      to: input.prioridad,
      reason: input.reason,
    });

    if (decision.value.nextStage) {
      await audit.log(input.actorId, "stage_changed", "lead", input.leadId, {
        from: lead.stage,
        to: decision.value.nextStage,
      });
    }

    return Ok(decision.value.events);
  });

  if (!result.ok) return result;
  await dispatchLeadNotifications(result.value, pipelineNotificationCenter);
  return Ok(undefined);
}
