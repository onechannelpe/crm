import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { createEventsRepo } from "~/server/shared/repos-events";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { LeadEvent } from "~/server/workflow/lead/domain/events";
import type { LeadState } from "~/server/workflow/lead/domain/state";

import { toLeadEventAppend } from "./lead-events";

export type LeadTransition = { next: LeadState; events: LeadEvent[] };

export type LeadAssignment = {
  toExecutiveId: number;
  assignedBy: number;
  at: number;
};

async function replaceActiveAssignment(
  tx: DatabaseExecutor,
  input: LeadAssignment & { leadId: string },
): Promise<void> {
  await tx
    .updateTable("workflow_lead_assignments")
    .set({ is_active: 0 })
    .where("lead_id", "=", input.leadId)
    .where("is_active", "=", 1)
    .execute();

  await tx
    .insertInto("workflow_lead_assignments")
    .values({
      id: randomUUIDv7(),
      lead_id: input.leadId,
      executive_id: input.toExecutiveId,
      assigned_by: input.assignedBy,
      is_active: 1,
      assigned_at: input.at,
    })
    .execute();
}

// Applies one lead lifecycle transition: the version-checked snapshot update, the
// optional active-assignment swap, and the event-log append.
// Returns `concurrency_conflict` when another writer moved the lead first; the
// runner turns that into a rollback so no child write survives the conflict.
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
      executive_id: next.executiveId,
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
    await replaceActiveAssignment(tx, { ...assignment, leadId: next.id });
  }

  const eventIds = await createEventsRepo(tx).append(
    events.map(toLeadEventAppend),
  );

  return Ok({ eventIds });
}

// Appends timeline facts (notes, calls, registration) without taking the lead
// version lock: multiple actors recording activity on one lead must not collide
// on optimistic concurrency. The lead row is only touched to advance
// `updated_at`/`updated_by`; a deleted lead rejects the append.
export async function appendFacts(
  tx: DatabaseExecutor,
  events: LeadEvent[],
  now: number,
): Promise<Result<{ eventIds: string[] }, DomainError>> {
  const leadId = events[0]?.leadId;
  if (!leadId) return Ok({ eventIds: [] });

  const updateResult = await tx
    .updateTable("workflow_leads")
    .set({ updated_at: now, updated_by: events[0].actorUserId })
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
