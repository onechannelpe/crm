import type { Kysely } from "kysely";

import type { Database, NewAuthFunnelEvent } from "~/lib/db/types";
import type {
  AuthFunnelEventName,
  AuthFunnelMethod,
  AuthFunnelOutcome,
} from "~/lib/observability/auth-funnel";

export interface AuthFunnelEventFilter {
  fromInclusive: number;
  toInclusive: number;
  eventName?: AuthFunnelEventName;
  method?: Exclude<AuthFunnelMethod, null>;
  outcome?: AuthFunnelOutcome;
  limit: number;
}

export interface AuthFunnelSummaryFilter {
  fromInclusive: number;
  toInclusive: number;
  eventName?: AuthFunnelEventName;
  method?: Exclude<AuthFunnelMethod, null>;
  outcome?: AuthFunnelOutcome;
}

export function createAuthFunnelEventsRepo(db: Kysely<Database>) {
  return {
    create(values: NewAuthFunnelEvent) {
      return db
        .insertInto("auth_funnel_events")
        .values(values)
        .executeTakeFirstOrThrow();
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

    async deleteCreatedBefore(cutoffMs: number): Promise<number> {
      const result = await db
        .deleteFrom("auth_funnel_events")
        .where("created_at", "<", cutoffMs)
        .executeTakeFirst();
      return Number(result.numDeletedRows ?? 0);
    },
  };
}

export type AuthFunnelEventsRepo = ReturnType<
  typeof createAuthFunnelEventsRepo
>;
