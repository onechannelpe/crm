import type { Role } from "~/lib/auth/access/rbac";
import type { LeadCallOutcome } from "~/lib/db/types";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { pipelineAuditService } from "~/server/shared/pipeline-runtime";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createLeadPipelineRepos } from "../infrastructure/repos";
import { getLeadDetail } from "./detail";

export async function logLeadInteraction(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
  kind: "call" | "note";
  outcome?: LeadCallOutcome;
  bodyText?: string | null;
}): Promise<Result<{ interactionId: number }, DomainError>> {
  const detail = await getLeadDetail({
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    leadId: input.leadId,
  });
  if (!detail.ok) {
    return detail;
  }

  const bodyText = input.bodyText?.trim() ?? null;
  if (input.kind === "call" && !input.outcome) {
    return Err(
      domainError(
        "validation",
        "call_outcome_required",
        "Call outcome is required",
      ),
    );
  }

  if (input.kind === "note" && !bodyText) {
    return Err(
      domainError("validation", "note_required", "Note body is required"),
    );
  }

  return runInPipelineTransaction(async ({ executor, afterCommit }) => {
    const repos = createLeadPipelineRepos(executor);
    const interactionId = await repos.leadInteractions.insert({
      lead_id: input.leadId,
      kind: input.kind,
      outcome: input.kind === "call" ? (input.outcome ?? null) : null,
      body_text: bodyText,
      created_by: input.actorUserId,
      created_at: Date.now(),
    });

    afterCommit(async () => {
      await pipelineAuditService.log(
        input.actorUserId,
        "lead_interaction_logged",
        "lead",
        input.leadId,
        {
          interactionId,
          kind: input.kind,
        },
      );
    });

    return Ok({ interactionId });
  });
}
