import type { Role } from "~/lib/auth/access/rbac";
import { pipelineAuditService } from "~/server/pipeline/infrastructure/deps";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { createHistoryEvent } from "../../domain/history";
import { createPipelineDeps } from "../../infrastructure/deps";
import { canReadRecord, canViewAllRecords } from "../policies/access";

export async function addNote(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
  body: string;
}): Promise<Result<{ interactionId: number }, DomainError>> {
  if (!canReadRecord(input.actorRole)) {
    return Err(domainError("forbidden", "forbidden", "Access denied"));
  }

  const body = input.body.trim();
  if (!body) {
    return Err(
      domainError("validation", "note_required", "Note body is required"),
    );
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
        eventType: "note_added",
        actorUserId: input.actorUserId,
        payload: { body },
        occurredAt: now,
      }),
    );
    await pipelineAuditService.log(
      input.actorUserId,
      "note_added",
      "lead",
      input.leadId,
      { historyId },
    );

    return Ok({ interactionId: historyId });
  });
}
