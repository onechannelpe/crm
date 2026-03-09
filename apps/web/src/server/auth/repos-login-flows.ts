import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/schema";

export function createLoginFlowsRepo(db: Kysely<Database>) {
  return {
    async create(values: {
      identifier: string;
      user_id?: number | null;
      state: "totp";
      expires_at: number;
    }): Promise<number> {
      const now = Date.now();
      const inserted = await db
        .insertInto("login_flows")
        .values({
          identifier: values.identifier,
          user_id: values.user_id ?? null,
          state: values.state,
          expires_at: values.expires_at,
          created_at: now,
          updated_at: now,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      return inserted.id;
    },

    findById(id: number) {
      return db
        .selectFrom("login_flows")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    async delete(id: number): Promise<void> {
      await db.deleteFrom("login_flows").where("id", "=", id).execute();
    },

    async deleteExpired(now = Date.now()): Promise<number> {
      const result = await db
        .deleteFrom("login_flows")
        .where("expires_at", "<", now)
        .executeTakeFirst();

      return Number(result.numDeletedRows ?? 0);
    },
  };
}
