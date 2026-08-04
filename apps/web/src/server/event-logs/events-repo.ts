import { randomUUIDv7 } from "bun";

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
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { notify } from "~/server/platform/database/notifications/publish";

export interface AuditReaderQueryFilter {
  fromInclusive: Date;
  toInclusive: Date;
  limit: number;
  action?: string;
  entityType?: string;
  actorUserId?: UserId;
  onlyHighRisk?: boolean;
}

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

export function createEventsRepo(db: DatabaseExecutor) {
  return {
    async append(input: EventToAppend | EventToAppend[]): Promise<EventId[]> {
      const list = Array.isArray(input) ? input : [input];
      if (list.length === 0) return [];

      const rows = list.map((event) => ({
        id: randomUUIDv7(),
        entity_type: event.entityType,
        entity_id: event.entityId,
        type: event.type,
        actor_user_id: event.actorUserId ?? null,
        subject_user_id: event.subjectUserId ?? null,
        payload_json: serializeEventPayload(event.payload),
        changes_json: event.changes
          ? serializeFieldChanges(event.changes)
          : null,
        occurred_at: event.occurredAt,
      }));

      return db.transaction().execute(async (trx) => {
        await trx.insertInto("events").values(rows).execute();

        for (const row of rows) {
          const payload = serializeEventLogStreamPayload(
            mapDomainEventRow(row),
          );
          if (payload) {
            // A transaction has one connection, so publish in order.
            // eslint-disable-next-line no-await-in-loop
            await notify(trx, EVENT_LOGS_STREAM_CHANNEL, payload);
          }
        }

        return rows.map((row) => EventId.trust(row.id));
      });
    },

    async listRecent(filter: AuditReaderQueryFilter) {
      if (filter.onlyHighRisk) {
        let query = db
          .selectFrom("events")
          .leftJoin(
            "audit_action_policies as policy",
            "policy.action",
            "events.type",
          )
          .selectAll("events")
          .where("events.occurred_at", ">=", filter.fromInclusive)
          .where("events.occurred_at", "<=", filter.toInclusive)
          .where((eb) =>
            eb.or([
              eb("policy.action", "is", null),
              eb.and([
                eb("policy.risk_level", "=", "high"),
                eb("policy.is_active", "=", true),
              ]),
            ]),
          )
          .orderBy("events.occurred_at", "desc")
          .limit(filter.limit);

        if (filter.action) {
          query = query.where("events.type", "=", filter.action);
        }
        if (filter.entityType) {
          query = query.where("events.entity_type", "=", filter.entityType);
        }
        if (filter.actorUserId !== undefined) {
          query = query.where("events.actor_user_id", "=", filter.actorUserId);
        }

        return query.execute();
      }

      let query = db
        .selectFrom("events")
        .selectAll()
        .where("occurred_at", ">=", filter.fromInclusive)
        .where("occurred_at", "<=", filter.toInclusive)
        .orderBy("occurred_at", "desc")
        .limit(filter.limit);

      if (filter.action) {
        query = query.where("type", "=", filter.action);
      }
      if (filter.entityType) {
        query = query.where("entity_type", "=", filter.entityType);
      }
      if (filter.actorUserId !== undefined) {
        query = query.where("actor_user_id", "=", filter.actorUserId);
      }

      return query.execute();
    },
  };
}

export type EventsRepo = ReturnType<typeof createEventsRepo>;
