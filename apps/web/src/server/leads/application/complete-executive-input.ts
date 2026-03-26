import type { DomainError } from "~/server/shared/domain-error";
import { domainError } from "~/server/shared/domain-error";
import {
  createPipelineRepos,
  pipelineAuditService,
  pipelineNotificationCenter,
} from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { type Result, Err, Ok } from "~/server/shared/result";

import { completeCommercialInput } from "../domain/lead-pipeline";
import { dispatchLeadNotifications } from "./lead-notification-dispatcher";

export async function completeExecutiveInputUseCase(input: {
  leadId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
  actorId: number;
  branchId: number;
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

      const decision = completeCommercialInput({
        ...input,
        lead,
        now: Date.now(),
      });
      if (!decision.ok) return decision;

      await repos.leadCommercialInputs.upsert(decision.value.commercialInput);
      await repos.leads.updateById(input.leadId, {
        stage: "READY_FOR_QUOTATION",
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
            to: "READY_FOR_QUOTATION",
          },
        );
      });
      if (decision.value.events.length > 0) {
        afterCommit(() =>
          dispatchLeadNotifications(
            decision.value.events,
            pipelineNotificationCenter,
          ),
        );
      }

      return Ok(decision.value.events);
    },
  );

  return result.ok ? Ok(undefined) : result;
}
