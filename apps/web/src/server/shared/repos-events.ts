import { randomUUIDv7 } from "bun";

import {
  serializeEventPayload,
  serializeFieldChanges,
  type FieldChange,
} from "~/contracts/events";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export interface AuditReaderQueryFilter {
  fromInclusive: number;
  toInclusive: number;
  limit: number;
  action?: string;
  entityType?: string;
  actorUserId?: number;
  onlyHighRisk?: boolean;
}

export type EventToAppend = {
  entityType: string;
  entityId: string | number;
  type: string;
  actorUserId?: number | null;
  subjectUserId?: number | null;
  payload?: unknown;
  changes?: FieldChange[];
  occurredAt: number;
};

export function createEventsRepo(db: DatabaseExecutor) {
  return {
    async append(input: EventToAppend | EventToAppend[]): Promise<string[]> {
      const list = Array.isArray(input) ? input : [input];
      if (list.length === 0) return [];

      const rows = list.map((event) => ({
        id: randomUUIDv7(),
        entity_type: event.entityType,
        entity_id: String(event.entityId),
        type: event.type,
        actor_user_id: event.actorUserId ?? null,
        subject_user_id: event.subjectUserId ?? null,
        payload_json: serializeEventPayload(event.payload),
        changes_json: event.changes
          ? serializeFieldChanges(event.changes)
          : null,
        occurred_at: event.occurredAt,
      }));

      await db.insertInto("events").values(rows).execute();
      return rows.map((row) => row.id);
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
                eb("policy.is_active", "=", 1),
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
