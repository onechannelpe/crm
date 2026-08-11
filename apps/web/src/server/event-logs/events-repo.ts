import { randomUUIDv7 } from "bun";
import type { Insertable, Transaction } from "kysely";

import {
  serializeEventPayload,
  serializeFieldChanges,
  type FieldChange,
} from "~/contracts/events";
import { EventId, type UserId } from "~/domain/ids";
import { mapDomainEventRow } from "~/server/event-logs/mappers";
import {
  EVENT_LOGS_STREAM_CHANNEL,
  serializeEventLogStreamPayload,
} from "~/server/event-logs/stream-contract";
import { enqueueNotifications } from "~/server/notifications/intent/enqueue";
import { NOTIFICATION_EVENT_POLICIES } from "~/server/notifications/policy/registry";
import { notify } from "~/server/platform/database/notifications/publish";
import type { Database } from "~/server/platform/database/types";

export type EventToAppend = {
  entityType: string;
  entityId: string;
  type: string;
  actorUserId?: UserId | null;
  subjectUserId?: UserId | null;
  payload?: unknown;
  changes?: FieldChange[];
  occurredAt: Date;
};

type NewEventRow = Required<Insertable<Database["events"]>>;

function toNewEventRows(input: EventToAppend | EventToAppend[]): NewEventRow[] {
  const list = Array.isArray(input) ? input : [input];
  return list.map((event) => ({
    id: randomUUIDv7(),
    entity_type: event.entityType,
    entity_id: event.entityId,
    type: event.type,
    actor_user_id: event.actorUserId ?? null,
    subject_user_id: event.subjectUserId ?? null,
    payload_json: serializeEventPayload(event.payload),
    changes_json: event.changes ? serializeFieldChanges(event.changes) : null,
    occurred_at: event.occurredAt,
  }));
}

// Requires an already-open transaction: the insert and its pg_notify calls
// share one connection, so the notify is only released when this transaction
// commits (see notify() in platform/database/notifications/publish.ts).
async function appendEvents(
  tx: Transaction<Database>,
  input: EventToAppend | EventToAppend[],
): Promise<EventId[]> {
  const list = Array.isArray(input) ? input : [input];
  const rows = toNewEventRows(list);
  if (rows.length === 0) {
    return [];
  }

  await tx.insertInto("events").values(rows).execute();

  for (const [index, row] of rows.entries()) {
    const payload = serializeEventLogStreamPayload(mapDomainEventRow(row));
    if (payload) {
      // A transaction has one connection, so publish in order.
      // eslint-disable-next-line no-await-in-loop
      await notify(tx, EVENT_LOGS_STREAM_CHANNEL, payload);
    }

    // Recording the fact and deciding whether it is notify-worthy share one
    // transaction: a notification never outlives the event that caused it,
    // and a rolled-back event never leaves an orphaned notification behind.
    const event = list[index];
    const intent = NOTIFICATION_EVENT_POLICIES[row.type]?.buildIntent({
      eventId: EventId.trust(row.id),
      actorUserId: event.actorUserId ?? null,
      subjectUserId: event.subjectUserId ?? null,
      occurredAt: event.occurredAt,
      payload: event.payload,
    });
    if (intent) {
      // eslint-disable-next-line no-await-in-loop
      await enqueueNotifications(tx, [intent], event.occurredAt);
    }
  }

  return rows.map((row) => EventId.trust(row.id));
}

export function createEventsWriter(tx: Transaction<Database>) {
  return {
    append(input: EventToAppend | EventToAppend[]): Promise<EventId[]> {
      return appendEvents(tx, input);
    },
  };
}

export type EventsWriter = {
  append(input: EventToAppend | EventToAppend[]): Promise<EventId[]>;
};
