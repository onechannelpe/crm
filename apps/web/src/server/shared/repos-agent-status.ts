import type { Kysely } from "kysely";

import type { Database, AgentStatusLogsTable } from "~/lib/db/types";
import type { UserId } from "~/server/shared/ids";

type AgentStatus = AgentStatusLogsTable["status"];

export function createAgentStatusRepo(db: Kysely<Database>) {
  return {
    create(values: {
      user_id: UserId;
      status: AgentStatus;
      latitude: number;
      longitude: number;
      comment?: string;
    }) {
      return db
        .insertInto("agent_status_logs")
        .values({
          ...values,
          comment: values.comment ?? null,
          started_at: new Date(),
        })
        .executeTakeFirstOrThrow();
    },

    findCurrentByUser(userId: UserId) {
      return db
        .selectFrom("agent_status_logs")
        .selectAll()
        .where("user_id", "=", userId)
        .where("ended_at", "is", null)
        .executeTakeFirst();
    },

    endCurrent(id: string) {
      return db
        .updateTable("agent_status_logs")
        .set({ ended_at: new Date() })
        .where("id", "=", id)
        .execute();
    },
  };
}
