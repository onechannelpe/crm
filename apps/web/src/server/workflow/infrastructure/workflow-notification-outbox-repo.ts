import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { WorkflowNotificationIntent } from "~/server/workflow/application/workflow-notification-policy";

export async function enqueueWorkflowNotificationOutboxEvents(
  executor: DatabaseExecutor,
  intents: WorkflowNotificationIntent[],
  now: number,
) {
  if (intents.length < 1) return;

  await executor
    .insertInto("workflow_notification_outbox")
    .values(
      intents.map((intent) => ({
        id: randomUUIDv7("hex", now),
        source_event_id: intent.sourceEventId,
        lead_id: intent.leadId,
        executive_id: intent.executiveId,
        branch_id: intent.branchId,
        event_type: intent.eventType,
        priority: intent.priority,
        title: intent.title,
        body_text: intent.bodyText,
        action_url: intent.actionUrl,
        audience_kind: intent.audienceKind,
        audience_roles_csv:
          intent.audienceKind === "branch_role"
            ? intent.audienceRoles.join(",")
            : null,
        status: "pending",
        attempt_count: 0,
        max_attempts: 5,
        available_at: now,
        lease_owner: null,
        lease_until: null,
        error_message: null,
        created_at: now,
        processed_at: null,
      })),
    )
    .onConflict((oc) => oc.column("source_event_id").doNothing())
    .execute();
}

export function createWorkflowNotificationOutboxRepo(
  executor: DatabaseExecutor,
) {
  return {
    async claimPending(workerId: string, limit: number, leaseMs: number) {
      const now = Date.now();
      const leaseUntil = now + leaseMs;

      const candidates = await executor
        .selectFrom("workflow_notification_outbox")
        .select("id")
        .where("status", "=", "pending")
        .where("available_at", "<=", now)
        .where((eb) =>
          eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
        )
        .orderBy("created_at", "asc")
        .limit(limit)
        .execute();

      if (candidates.length < 1) {
        return [];
      }

      const ids = candidates.map((row) => row.id);
      await executor
        .updateTable("workflow_notification_outbox")
        .set((eb) => ({
          status: "processing",
          lease_owner: workerId,
          lease_until: leaseUntil,
          attempt_count: eb("attempt_count", "+", 1),
        }))
        .where("id", "in", ids)
        .where("status", "=", "pending")
        .execute();

      return executor
        .selectFrom("workflow_notification_outbox")
        .selectAll()
        .where("id", "in", ids)
        .where("status", "=", "processing")
        .where("lease_owner", "=", workerId)
        .execute();
    },

    async extendLease(id: string, workerId: string, leaseMs: number) {
      const now = Date.now();
      const result = await executor
        .updateTable("workflow_notification_outbox")
        .set({ lease_until: now + leaseMs })
        .where("id", "=", id)
        .where("status", "=", "processing")
        .where("lease_owner", "=", workerId)
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    async markCompleted(id: string) {
      await executor
        .updateTable("workflow_notification_outbox")
        .set({
          status: "completed",
          processed_at: Date.now(),
          lease_owner: null,
          lease_until: null,
          error_message: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async scheduleRetry(id: string, availableAt: number) {
      await executor
        .updateTable("workflow_notification_outbox")
        .set({
          status: "pending",
          available_at: availableAt,
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async markFailed(id: string, reason: string) {
      await executor
        .updateTable("workflow_notification_outbox")
        .set({
          status: "failed",
          error_message: reason,
          processed_at: Date.now(),
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .execute();
    },
  };
}

export type WorkflowNotificationOutboxRepo = ReturnType<
  typeof createWorkflowNotificationOutboxRepo
>;
