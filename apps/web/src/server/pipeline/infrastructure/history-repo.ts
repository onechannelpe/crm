import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type HistoryEventRow = Selectable<Database["pipeline_history_events"]>;
export type NewHistoryEventRow = Insertable<
  Database["pipeline_history_events"]
>;

export function createHistoryRepo(db: DatabaseExecutor) {
  return {
    async insert(values: NewHistoryEventRow): Promise<number> {
      const result = await db
        .insertInto("pipeline_history_events")
        .values(values)
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    listByRecordId(leadId: number) {
      return db
        .selectFrom("pipeline_history_events as event")
        .leftJoin("users as actor", "actor.id", "event.actor_user_id")
        .leftJoin("users as subject", "subject.id", "event.subject_user_id")
        .select([
          "event.id",
          "event.lead_id",
          "event.event_type",
          "event.actor_user_id",
          "event.subject_user_id",
          "event.payload_json",
          "event.occurred_at",
          "actor.names as actor_names",
          "actor.first_surname as actor_first_surname",
          "actor.second_surname as actor_second_surname",
          "subject.names as subject_names",
          "subject.first_surname as subject_first_surname",
          "subject.second_surname as subject_second_surname",
        ])
        .where("event.lead_id", "=", leadId)
        .orderBy("event.occurred_at", "desc")
        .execute();
    },
  };
}
