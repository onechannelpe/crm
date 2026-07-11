import type { Insertable, Kysely } from "kysely";

import { notify } from "~/lib/db/notify";
import type { ActionObservationsTable, Database } from "~/lib/db/types";
import { mapActionObservationRow } from "~/server/event-logs/mappers";
import {
  EVENT_LOGS_STREAM_CHANNEL,
  serializeEventLogStreamPayload,
} from "~/server/event-logs/stream-contract";
import type { UserId } from "~/server/shared/ids";

type NewActionObservationRow = Insertable<Database["action_observations"]>;

type ObservationStatus = ActionObservationsTable["status"];

export interface ActionObservationFilter {
  fromInclusive: Date;
  toInclusive: Date;
  actionName?: string;
  status?: ObservationStatus;
  actorUserId?: UserId;
  limit: number;
}

export interface ActionObservationSummaryFilter {
  fromInclusive: Date;
  toInclusive: Date;
  actionName?: string;
  status?: ObservationStatus;
  actorUserId?: UserId;
}

export function createActionObservationsRepo(db: Kysely<Database>) {
  return {
    async create(values: NewActionObservationRow) {
      const row = await db
        .insertInto("action_observations")
        .values(values)
        .returningAll()
        .executeTakeFirstOrThrow();

      const payload = serializeEventLogStreamPayload(
        mapActionObservationRow(row),
      );
      if (payload) notify(db, EVENT_LOGS_STREAM_CHANNEL, payload);

      return row;
    },

    async findRecent(filter: ActionObservationFilter) {
      let query = db
        .selectFrom("action_observations")
        .selectAll()
        .where("created_at", ">=", filter.fromInclusive)
        .where("created_at", "<=", filter.toInclusive)
        .orderBy("created_at", "desc")
        .limit(filter.limit);

      if (filter.actionName) {
        query = query.where("action_name", "=", filter.actionName);
      }
      if (filter.status) {
        query = query.where("status", "=", filter.status);
      }
      if (filter.actorUserId !== undefined) {
        query = query.where("actor_user_id", "=", filter.actorUserId);
      }

      return query.execute();
    },

    async summarizeByAction(filter: ActionObservationSummaryFilter) {
      let query = db
        .selectFrom("action_observations")
        .select((eb) => [
          "action_name",
          eb.fn.count<number>("id").as("count"),
          eb.fn
            .sum<number>(
              eb.case().when("status", "=", "error").then(1).else(0).end(),
            )
            .as("error_count"),
          eb.fn.avg<number>("duration_ms").as("avg_duration_ms"),
          eb.fn.max<number>("duration_ms").as("max_duration_ms"),
        ])
        .where("created_at", ">=", filter.fromInclusive)
        .where("created_at", "<=", filter.toInclusive);

      if (filter.actionName) {
        query = query.where("action_name", "=", filter.actionName);
      }
      if (filter.status) {
        query = query.where("status", "=", filter.status);
      }
      if (filter.actorUserId !== undefined) {
        query = query.where("actor_user_id", "=", filter.actorUserId);
      }

      return query.groupBy("action_name").orderBy("count", "desc").execute();
    },

    async deleteCreatedBefore(cutoff: Date): Promise<number> {
      const result = await db
        .deleteFrom("action_observations")
        .where("created_at", "<", cutoff)
        .executeTakeFirst();
      return Number(result.numDeletedRows ?? 0);
    },
  };
}

export type ActionObservationsRepo = ReturnType<
  typeof createActionObservationsRepo
>;
