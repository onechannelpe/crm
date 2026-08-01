import type { Insertable, Kysely, Selectable } from "kysely";

import type { Database } from "~/server/platform/database/types";

type RequestSessionRow = Selectable<Database["request_sessions"]>;
type NewRequestSessionRow = Insertable<Database["request_sessions"]>;

export function createRequestSessionsRepo(db: Kysely<Database>) {
  return {
    async create(session: NewRequestSessionRow): Promise<void> {
      await db.insertInto("request_sessions").values(session).execute();
    },

    async findById(id: string): Promise<RequestSessionRow | null> {
      const session = await db
        .selectFrom("request_sessions")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();

      return session ?? null;
    },

    async updateActivity(id: string, lastActivity: Date): Promise<void> {
      await db
        .updateTable("request_sessions")
        .set({ last_activity: lastActivity })
        .where("id", "=", id)
        .execute();
    },

    async deleteExpired(now: Date): Promise<number> {
      const result = await db
        .deleteFrom("request_sessions")
        .where("expires_at", "<", now)
        .executeTakeFirst();

      return Number(result.numDeletedRows ?? 0);
    },
  };
}
