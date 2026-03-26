import { dispatchLeadNotifications } from "~/server/leads/application/lead-notification-dispatcher";
import { ensureLeadCanApproveForSale } from "~/server/leads/domain/lead-pipeline";
import type { DomainError } from "~/server/shared/domain-error";
import { domainError } from "~/server/shared/domain-error";
import {
  createPipelineRepos,
  pipelineAuditService,
  pipelineNotificationCenter,
} from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { type Result, Err, Ok } from "~/server/shared/result";

export async function approveForSaleUseCase(input: {
  leadId: number;
  actorId: number;
}): Promise<Result<void, DomainError>> {
  const result = await runInPipelineTransaction(
    async ({ executor, afterCommit }) => {
      const repos = createPipelineRepos(executor);
      const lead = await repos.leads.findById(input.leadId);
      if (!lead) {
        return Err(
          domainError("not_found", "lead_not_found", "Lead not found"),
        );
      }

      const decision = ensureLeadCanApproveForSale(lead);
      if (!decision.ok) return decision;

      await repos.leads.updateById(input.leadId, {
        stage: "READY_FOR_SALE",
        updated_at: Date.now(),
      });

      afterCommit(async () => {
        await pipelineAuditService.log(
          input.actorId,
          "stage_changed",
          "lead",
          input.leadId,
          {
            from: lead.stage,
            to: "READY_FOR_SALE",
          },
        );
      });
      if (decision.value.length > 0) {
        afterCommit(() =>
          dispatchLeadNotifications(decision.value, pipelineNotificationCenter),
        );
      }

      return Ok(decision.value);
    },
  );

  return result.ok ? Ok(undefined) : result;
}
