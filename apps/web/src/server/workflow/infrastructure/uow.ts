import { randomUUIDv7 } from "bun";

import { serializeAuditChanges } from "~/contracts/audit";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { domainError } from "~/server/shared/domain-error";
import { Err, Ok } from "~/server/shared/result";
import { enqueueNotifications } from "~/server/notifications/outbox";
import type { LeadEvent } from "~/server/workflow/domain/lead/events";
import type { LeadState } from "~/server/workflow/domain/lead/state";
import { deriveLeadStageNotifications } from "~/server/workflow/application/notification-policy";
import type { CommitInput, CommitResult, LeadUnitOfWork } from "~/server/workflow/application/ports/uow";

function deriveAuditAction(events: LeadEvent[]): string {
  return events[0]?.eventType ?? "lead_updated";
}

async function replaceActiveAssignment(
  db: DatabaseExecutor,
  input: { leadId: string; toExecutiveId: number; assignedBy: number; at: number },
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
      return executor.transaction().execute(async (db) => {
        const { next, events, idempotencyKey, assignment } = input;

        // 1. Idempotency check
        const existing = await db
          .selectFrom("workflow_idempotency_keys")
          .select("result_json")
          .where("key", "=", idempotencyKey)
          .executeTakeFirst();

        if (existing) {
          const prior = JSON.parse(existing.result_json) as CommitResult;
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
            version: next.version,
          })
          .where("id", "=", next.id)
          .where("version", "=", expectedVersion)
          .executeTakeFirst();

        if (Number(updateResult.numUpdatedRows) === 0) {
          return Err(domainError("conflict", "concurrency_conflict", "Lead was modified concurrently"));
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

        // 4. Insert domain events into history
        const eventIds: string[] = [];
        for (const event of events) {
          const id = randomUUIDv7();
          await db
            .insertInto("workflow_history_events")
            .values({
              id,
              lead_id: event.leadId,
              event_type: event.eventType,
              actor_user_id: event.actorUserId,
              subject_user_id: event.subjectUserId,
              payload_json: event.payload ? JSON.stringify(event.payload) : null,
              occurred_at: event.occurredAt,
            })
            .execute();
          eventIds.push(id);
        }

        // 5. Audit log
        const auditId = randomUUIDv7("hex", next.updatedAt);
        await db
          .insertInto("workflow_audit_logs")
          .values({
            id: auditId,
            user_id: next.updatedBy ?? next.createdBy,
            action: deriveAuditAction(events),
            entity_type: "lead",
            entity_id: next.id,
            changes: serializeAuditChanges({}),
            created_at: next.updatedAt,
          })
          .execute();

        // 6. Notifications (inside transaction for atomicity)
        const stageChangedEvents = events
          .map((e, i) => ({ event: e, id: eventIds[i]! }))
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

        // 7. Record idempotency key
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
      });
    },
  };
}
