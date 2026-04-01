import type { Role } from "~/lib/auth/access/rbac";
import { hasPermission } from "~/lib/auth/access/rbac";
import { pipelineAuditService } from "~/server/pipeline/infrastructure/deps";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { runInPipelineTransaction } from "~/server/shared/pipeline-transaction";
import { Err, Ok, type Result } from "~/server/shared/result";

import { ensureCanReassignRecord } from "../../domain/assignment";
import { createHistoryEvent } from "../../domain/history";
import { createPipelineDeps } from "../../infrastructure/deps";

export async function reassignRecord(input: {
  actorUserId: number;
  actorRole: Role;
  leadId: number;
  newExecutiveId: number;
}): Promise<Result<void, DomainError>> {
  if (!hasPermission(input.actorRole, "lead:reassign")) {
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

    const allowed = ensureCanReassignRecord({
      currentExecutiveId: record.executive_id,
      newExecutiveId: input.newExecutiveId,
    });
    if (!allowed.ok) {
      return allowed;
    }

    const newExecutive = await deps.users.findById(input.newExecutiveId);
    if (!newExecutive || !newExecutive.is_active) {
      return Err(
        domainError(
          "validation",
          "invalid_executive",
          "Target executive not found or inactive",
        ),
      );
    }

    const now = Date.now();
    await deps.assignments.deactivateActiveForRecord(input.leadId);
    await deps.assignments.insert({
      lead_id: input.leadId,
      executive_id: input.newExecutiveId,
      assigned_by: input.actorUserId,
      is_active: 1,
      assigned_at: now,
    });
    await deps.records.updateById(input.leadId, {
      executive_id: input.newExecutiveId,
      updated_at: now,
    });
    await deps.history.insert(
      createHistoryEvent({
        leadId: input.leadId,
        eventType: "record_reassigned",
        actorUserId: input.actorUserId,
        subjectUserId: input.newExecutiveId,
        payload: {
          fromExecutiveId: record.executive_id,
          toExecutiveId: input.newExecutiveId,
        },
        occurredAt: now,
      }),
    );
    await pipelineAuditService.log(
      input.actorUserId,
      "record_reassigned",
      "lead",
      input.leadId,
      {
        from: record.executive_id,
        to: input.newExecutiveId,
      },
    );

    return Ok(undefined);
  });
}
