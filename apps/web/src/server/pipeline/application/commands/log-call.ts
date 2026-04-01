import type { Role } from "~/lib/auth/access/rbac";
import type { LeadCallOutcome } from "~/lib/db/types";
import { pipelineAuditService } from "~/server/pipeline/infrastructure/deps";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import { createPipelineDeps } from "../../infrastructure/deps";
import { canReadRecord, canViewAllRecords } from "../policies/access";

export async function logCall(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
  outcome: LeadCallOutcome;
  notes?: string | null;
}): Promise<Result<{ interactionId: number }, DomainError>> {
  if (!canReadRecord(input.actorRole)) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  return runInPipelineTransaction(async ({ executor }) => {
    const deps = createPipelineDeps(executor);
    const record = await deps.records.findById(input.leadId);
    if (!record) {
      return Err(
        domainError("not_found", "record_not_found", "Record not found"),
      );
    }

    if (
      !canViewAllRecords(input.actorRole) &&
      record.executive_id !== input.actorUserId
    ) {
      return Err(domainError("forbidden", "forbidden", "Access denied"));
    }

    const now = Date.now();
    const historyId = await deps.history.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "call_logged",
        actorUserId: input.actorUserId,
        payload: { outcome: input.outcome, notes: input.notes?.trim() ?? null },
        occurredAt: now,
      }),
    );
    await pipelineAuditService.log(
      input.actorUserId,
      "call_logged",
      "lead",
      input.leadId,
      { historyId, outcome: input.outcome },
    );

    return Ok({ interactionId: historyId });
  });
}
