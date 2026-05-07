import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createLogger } from "~/lib/observability/logger";

import { resolveNotificationIntents } from "./intent-resolver";
import type { DomainEvent } from "./types";

const logger = createLogger("notifications-projector");

function insertedRowCount(
  result:
    | { numInsertedOrUpdatedRows?: bigint | number }
    | Array<{ numInsertedOrUpdatedRows?: bigint | number }>,
): number {
  if (Array.isArray(result)) {
    return result.reduce((total, item) => total + insertedRowCount(item), 0);
  }
  if (typeof result.numInsertedOrUpdatedRows === "bigint") {
    return Number(result.numInsertedOrUpdatedRows);
  }
  if (typeof result.numInsertedOrUpdatedRows === "number") {
    return result.numInsertedOrUpdatedRows;
  }
  return 0;
}

export async function projectDomainEvent(
  db: Kysely<Database>,
  event: DomainEvent,
): Promise<void> {
  const eventInsert = await db
    .insertInto("domain_events")
    .values(event)
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();

  logger.info("event_projected", {
    source_event_id: event.id,
    aggregate_id: event.aggregate_id,
    aggregate_type: event.aggregate_type,
    event_type: event.event_type,
    deduped: insertedRowCount(eventInsert) < 1,
  });

  const intents = resolveNotificationIntents(event);
  if (intents.length < 1) {
    return;
  }

  const intentInsert = await db
    .insertInto("notification_intents_outbox")
    .values(
      intents.map((intent) => ({
        intent_id: intent.intentId,
        source_event_id: intent.sourceEventId,
        event_type: intent.eventType,
        aggregate_id: event.aggregate_id,
        audience_kind: intent.audienceKind,
        title: intent.title,
        body_text: intent.bodyText,
        action_url: intent.actionUrl,
        priority: intent.priority,
        status: "pending",
        attempt_count: 0,
        max_attempts: 5,
        available_at: event.occurred_at,
        lease_owner: null,
        lease_until: null,
        error_message: null,
        created_at: event.occurred_at,
        processed_at: null,
      })),
    )
    .onConflict((oc) => oc.column("intent_id").doNothing())
    .execute();

  const now = event.occurred_at;
  await db
    .insertInto("notification_intent_channels")
    .values(
      intents.flatMap((intent) =>
        intent.channels.map((channel) => ({
          intent_id: intent.intentId,
          channel,
          created_at: now,
        })),
      ),
    )
    .onConflict((oc) => oc.columns(["intent_id", "channel"]).doNothing())
    .execute();

  await db
    .insertInto("notification_intent_targets")
    .values(
      intents.flatMap((intent) =>
        intent.targets.map((target) => ({
          intent_id: intent.intentId,
          target_kind: target.targetKind,
          user_id: target.targetKind === "user_id" ? target.userId : null,
          branch_id:
            target.targetKind === "branch_role" ? target.branchId : null,
          role:
            target.targetKind === "branch_role" ||
            target.targetKind === "global_role"
              ? target.role
              : null,
          team_id: target.targetKind === "team_id" ? target.teamId : null,
          created_at: now,
        })),
      ),
    )
    .onConflict((oc) =>
      oc
        .columns([
          "intent_id",
          "target_kind",
          "user_id",
          "branch_id",
          "role",
          "team_id",
        ])
        .doNothing(),
    )
    .execute();

  logger.info("intent_enqueued", {
    source_event_id: event.id,
    intent_count: intents.length,
    intent_inserted_count: insertedRowCount(intentInsert),
    aggregate_id: event.aggregate_id,
  });
}

export async function projectLeadStageChangedEvent(
  db: Kysely<Database>,
  input: {
    id: string;
    leadId: string;
    toStage: string;
    ruc: string;
    executiveId: number;
    branchId: number | null;
    occurredAt: number;
  },
): Promise<void> {
  await projectDomainEvent(db, {
    id: input.id,
    aggregate_type: "lead",
    aggregate_id: input.leadId,
    event_type: "lead.stage_changed",
    payload_json: JSON.stringify({
      to: input.toStage,
      ruc: input.ruc,
      executiveId: input.executiveId,
      branchId: input.branchId,
    }),
    occurred_at: input.occurredAt,
  });
}
