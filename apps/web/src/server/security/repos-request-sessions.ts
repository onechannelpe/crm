import type { Kysely } from "kysely";

import type {
  Database,
  NewRequestSession,
  RequestSession,
} from "~/lib/db/types";

export function createRequestSessionsRepo(db: Kysely<Database>) {
  return {
    async create(session: NewRequestSession): Promise<void> {
      await db.insertInto("request_sessions").values(session).execute();
    },

    async findById(id: string): Promise<RequestSession | null> {
      const session = await db
        .selectFrom("request_sessions")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      return session ?? null;
    },

    async updateActivity(id: string, lastActivity: number): Promise<void> {
      await db
        .updateTable("request_sessions")
        .set({ last_activity: lastActivity })
        .where("id", "=", id)
        .execute();
    },

    async deleteExpired(now = Date.now()): Promise<number> {
      const result = await db
        .deleteFrom("request_sessions")
        .where("expires_at", "<", now)
        .executeTakeFirst();

      return Number(result.numDeletedRows ?? 0);
    },
  };
}
