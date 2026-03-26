import { domainError, type DomainError } from "~/server/shared/domain-error";
import {
  createPipelineRepos,
  pipelineAuditService,
} from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Ok, Err, type Result } from "~/server/shared/result";

import { buildRegisteredLead } from "../domain/lead-pipeline";

export async function registerLeadUseCase(input: {
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  actorId: number;
}): Promise<Result<{ id: number }, DomainError>> {
  const built = buildRegisteredLead({
    ...input,
    now: Date.now(),
  });
  if (!built.ok) return built;

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createPipelineRepos(executor);
    const existing = await repos.leads.findByRuc(input.ruc);
    if (existing) {
      return Err(
        domainError(
          "conflict",
          "ruc_conflict",
          "A lead with this RUC already exists",
        ),
      );
    }

    const executive = await repos.users.findById(input.executiveId);
    if (!executive || !executive.is_active) {
      return Err(
        domainError(
          "validation",
          "invalid_executive",
          "Target executive not found or inactive",
        ),
      );
    }

    const leadId = await repos.leads.insert(built.value.lead);
    await repos.leadAssignments.insert({
      lead_id: leadId,
      executive_id: input.executiveId,
      assigned_by: input.actorId,
      is_active: 1,
      assigned_at: built.value.lead.created_at,
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorId,
        "lead_created",
        "lead",
        leadId,
        {
          ruc: input.ruc,
          stage: "PENDING_EXTERNAL_REVIEW",
        },
      );
    });

    return Ok({ id: leadId });
  });
}
