import { randomUUIDv7 } from "bun";

import { enqueueNotifications } from "~/server/notifications/outbox";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { fail } from "~/server/shared/domain-error";
import { createEventsRepo } from "~/server/shared/repos-events";
import { Err, Ok } from "~/server/shared/result";
import { toLeadEventAppend } from "~/server/workflow/application/lead-events";
import { deriveLeadStageNotifications } from "~/server/workflow/application/notification-policy";
import type {
  CommitInput,
  CommitResult,
  LeadUnitOfWork,
} from "~/server/workflow/application/ports/uow";

async function replaceActiveAssignment(
  db: DatabaseExecutor,
  input: {
    leadId: string;
    toExecutiveId: number;
    assignedBy: number;
    at: number;
  },
): Promise<void> {
  await db
    .updateTable("workflow_lead_assignments")
    .set({ is_active: 0 })
    .where("lead_id", "=", input.leadId)
    .where("is_active", "=", 1)
    .execute();

  await db
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

export function createLeadUow(executor: DatabaseExecutor): LeadUnitOfWork {
  return {
    async commit(input: CommitInput) {
      const db = executor;
      const { next, events, idempotencyKey, assignment } = input;

      // 1. Idempotency check
      const existing = await db
        .selectFrom("workflow_idempotency_keys")
        .select("result_json")
        .where("key", "=", idempotencyKey)
        .executeTakeFirst();

      if (existing) {
        const prior: CommitResult = JSON.parse(existing.result_json);
        return Ok({ ...prior, wasIdempotent: true });
      }

      // 2. Optimistic concurrency update
      const expectedVersion = next.version - 1;
      const updateResult = await db
        .updateTable("workflow_leads")
        .set({
          stage: next.stage,
          status: next.status,
          prioridad: next.prioridad,
          executive_id: next.executiveId,
          updated_by: next.updatedBy,
          updated_at: next.updatedAt,
          reservation_expires_at: next.reservationExpiresAt,
          version: next.version,
        })
        .where("id", "=", next.id)
        .where("version", "=", expectedVersion)
        .executeTakeFirst();

      if (Number(updateResult.numUpdatedRows) === 0) {
        return Err(fail("concurrency_conflict"));
      }

      // 3. Assignment replacement (for reassign)
      if (assignment) {
        await replaceActiveAssignment(db, {
          leadId: next.id,
          toExecutiveId: assignment.toExecutiveId,
          assignedBy: assignment.assignedBy,
          at: assignment.at,
        });
      }

      // 4. Append each lead event to the events spine in one write. The per-lead
      // activity feed and the cross-entity audit explorer are both read
      // projections of these rows.
      const eventIds = await createEventsRepo(db).append(
        events.map(toLeadEventAppend),
      );

      // 5. Notifications: enqueue inside the commit transaction
      const stageChangedEvents = events
        .map((e, i) => ({ event: e, id: eventIds[i] }))
        .filter(({ event }) => event.eventType === "workflow_stage_changed");

      if (stageChangedEvents.length > 0) {
        const branchRow = await db
          .selectFrom("users")
          .select("branch_id")
          .where("id", "=", next.executiveId)
          .executeTakeFirst();
        const branchId = branchRow?.branch_id ?? null;

        const intents = stageChangedEvents.flatMap(({ event, id }) => {
          if (event.eventType !== "workflow_stage_changed") return [];
          return deriveLeadStageNotifications({
            eventId: id,
            leadId: next.id,
            toStage: event.payload.to,
            ruc: next.ruc,
            executiveId: next.executiveId,
            branchId,
          });
        });

        await enqueueNotifications(db, intents, next.updatedAt);
      }

      // 6. Record idempotency key
      const commitResult: CommitResult = { eventIds, wasIdempotent: false };
      await db
        .insertInto("workflow_idempotency_keys")
        .values({
          key: idempotencyKey,
          result_json: JSON.stringify(commitResult),
          created_at: next.updatedAt,
        })
        .execute();

      return Ok(commitResult);
    },
  };
}
