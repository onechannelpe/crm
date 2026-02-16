import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/schema";

export function createWebauthnChallengesRepo(db: Kysely<Database>) {
  return {
    async create(values: {
      user_id: number | null;
      type: string;
      challenge: string;
      expires_at: number;
    }): Promise<number> {
      const inserted = await db
        .insertInto("webauthn_challenges")
        .values({ ...values, created_at: Date.now() })
        .returning("id")
        .executeTakeFirstOrThrow();

      return inserted.id;
    },

    findById(id: number) {
      return db
        .selectFrom("webauthn_challenges")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    async delete(id: number): Promise<void> {
      await db.deleteFrom("webauthn_challenges").where("id", "=", id).execute();
    },

    async deleteExpired(now = Date.now()): Promise<number> {
      const result = await db
        .deleteFrom("webauthn_challenges")
        .where("expires_at", "<", now)
        .executeTakeFirst();

      return Number(result.numDeletedRows ?? 0);
    },
  };
}
