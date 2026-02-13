import type { Kysely } from "kysely";
import type { Database, AgentStatusLogsTable } from "~/lib/db/schema";

type AgentStatus = AgentStatusLogsTable["status"];

export function createAgentStatusRepo(db: Kysely<Database>) {
    return {
        create(values: {
            user_id: number;
            status: AgentStatus;
            latitude: number;
            longitude: number;
            comment?: string;
        }) {
            return db
                .insertInto("agent_status_logs")
                .values({ ...values, comment: values.comment ?? null, started_at: Date.now() })
                .executeTakeFirstOrThrow();
        },

        findCurrentByUser(userId: number) {
            return db
                .selectFrom("agent_status_logs")
                .selectAll()
                .where("user_id", "=", userId)
                .where("ended_at", "is", null)
                .executeTakeFirst();
        },

        endCurrent(id: number) {
            return db
                .updateTable("agent_status_logs")
                .set({ ended_at: Date.now() })
                .where("id", "=", id)
                .execute();
        },
    };
}
