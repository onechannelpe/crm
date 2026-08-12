import type { Insertable, Kysely } from "kysely";

import type {
  AuthFunnelEventName,
  AuthFunnelMethod,
  AuthFunnelOutcome,
} from "~/domain/observability/auth-funnel";
import { mapAuthFunnelEventRow } from "~/server/event-logs/mappers";
import {
  EVENT_LOGS_STREAM_CHANNEL,
  serializeEventLogStreamPayload,
} from "~/server/event-logs/stream-contract";
import { notify } from "~/server/platform/database/notifications/publish";
import type { Database } from "~/server/platform/database/types";

type NewAuthFunnelEventRow = Insertable<Database["auth_funnel_events"]>;

interface AuthFunnelEventFilter {
  fromInclusive: Date;
  toInclusive: Date;
  eventName?: AuthFunnelEventName;
  method?: Exclude<AuthFunnelMethod, null>;
  outcome?: AuthFunnelOutcome;
  limit: number;
}

interface AuthFunnelSummaryFilter {
  fromInclusive: Date;
  toInclusive: Date;
  eventName?: AuthFunnelEventName;
  method?: Exclude<AuthFunnelMethod, null>;
  outcome?: AuthFunnelOutcome;
}

export function createAuthFunnelEventsRepo(db: Kysely<Database>) {
  return {
    async create(values: NewAuthFunnelEventRow) {
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .insertInto("auth_funnel_events")
          .values(values)
          .returningAll()
          .executeTakeFirstOrThrow();

        const payload = serializeEventLogStreamPayload(
          mapAuthFunnelEventRow(row),
        );
        if (payload) {
          await notify(trx, EVENT_LOGS_STREAM_CHANNEL, payload);
        }

        return row;
      });
    },

    async findRecent(filter: AuthFunnelEventFilter) {
      let query = db
        .selectFrom("auth_funnel_events")
        .selectAll()
        .where("created_at", ">=", filter.fromInclusive)
        .where("created_at", "<=", filter.toInclusive)
        .orderBy("created_at", "desc")
        .limit(filter.limit);

      if (filter.eventName) {
        query = query.where("event_name", "=", filter.eventName);
      }
      if (filter.method) {
        query = query.where("method", "=", filter.method);
      }
      if (filter.outcome) {
        query = query.where("outcome", "=", filter.outcome);
      }

      return query.execute();
    },

    async summarize(filter: AuthFunnelSummaryFilter) {
      let query = db
        .selectFrom("auth_funnel_events")
        .select((eb) => [
          "event_name",
          "screen",
          "method",
          "outcome",
          "source",
          eb.fn.count<number>("id").as("count"),
        ])
        .where("created_at", ">=", filter.fromInclusive)
        .where("created_at", "<=", filter.toInclusive);

      if (filter.eventName) {
        query = query.where("event_name", "=", filter.eventName);
      }
      if (filter.method) {
        query = query.where("method", "=", filter.method);
      }
      if (filter.outcome) {
        query = query.where("outcome", "=", filter.outcome);
      }

      return query
        .groupBy(["event_name", "screen", "method", "outcome", "source"])
        .orderBy("count", "desc")
        .execute();
    },

    async deleteCreatedBefore(createdBefore: Date): Promise<number> {
      const result = await db
        .deleteFrom("auth_funnel_events")
        .where("created_at", "<", createdBefore)
        .executeTakeFirst();
      return Number(result.numDeletedRows ?? 0);
    },
  };
}

type AuthFunnelEventsRepo = ReturnType<typeof createAuthFunnelEventsRepo>;
