import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { createEventsRepo } from "~/server/event-logs/events-repo";
import { assignOrganizationOwner } from "~/server/organization/ownership";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { LeadHistoryEventDraft } from "~/server/workflow/lead/domain/history";
import type { LeadState } from "~/server/workflow/lead/domain/state";
import { Err, Ok, type Result } from "~/shared/result";

import { toLeadEventAppend } from "./lead-events";

export type LeadTransition = {
  next: LeadState;
  events: LeadHistoryEventDraft[];
};

export type LeadAssignment = {
  toExecutiveId: UserId;
  assignedBy: UserId;
  at: Date;
};

export async function commitTransition(
  tx: DatabaseExecutor,
  transition: LeadTransition,
  assignment?: LeadAssignment,
): Promise<Result<{ eventIds: string[] }, DomainError>> {
  const { next, events } = transition;

  const updateResult = await tx
    .updateTable("workflow_leads")
    .set({
      stage: next.stage,
      status: next.status,
      priority: next.priority,
      updated_by: next.updatedBy,
      updated_at: next.updatedAt,
      reservation_expires_at: next.reservationExpiresAt,
      deleted_at: next.deletedAt,
      version: next.version,
    })
    .where("id", "=", next.id)
    .where("version", "=", next.version - 1)
    .executeTakeFirst();

  if (Number(updateResult.numUpdatedRows) === 0) {
    return Err(fail("concurrency_conflict"));
  }

  if (assignment) {
    const assigned = await assignOrganizationOwner(tx, {
      organizationId: next.organizationId,
      executiveId: assignment.toExecutiveId,
      assignedBy: assignment.assignedBy,
      at: assignment.at,
      reason: "workflow_reassignment",
    });

    if (!assigned.ok) {
      return assigned;
    }
  }

  const eventIds = await createEventsRepo(tx).append(
    events.map(toLeadEventAppend),
  );

  return Ok({ eventIds });
}

export async function appendFacts(
  tx: DatabaseExecutor,
  events: LeadHistoryEventDraft[],
  now: Date,
): Promise<Result<{ eventIds: string[] }, DomainError>> {
  const leadId = events[0]?.leadId;

  if (!leadId) {
    return Ok({ eventIds: [] });
  }

  const updateResult = await tx
    .updateTable("workflow_leads")
    .set({
      updated_at: now,
      updated_by: events[0].actorUserId,
    })
    .where("id", "=", leadId)
    .where("deleted_at", "is", null)
    .executeTakeFirst();

  if (Number(updateResult.numUpdatedRows) === 0) {
    return Err(fail("lead_not_found"));
  }

  const eventIds = await createEventsRepo(tx).append(
    events.map(toLeadEventAppend),
  );

  return Ok({ eventIds });
}
