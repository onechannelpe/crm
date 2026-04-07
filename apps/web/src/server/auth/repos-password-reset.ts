import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

export function createPasswordResetTokensRepo(db: Kysely<Database>) {
  return {
    create(values: {
      user_id: number;
      token_hash: string;
      expires_at: number;
      created_at: number;
    }) {
      return db
        .insertInto("password_reset_tokens")
        .values({ ...values, used_at: null })
        .execute();
    },

    findValidByHash(tokenHash: string, now: number) {
      return db
        .selectFrom("password_reset_tokens")
        .selectAll()
        .where("token_hash", "=", tokenHash)
        .where("expires_at", ">", now)
        .where("used_at", "is", null)
        .executeTakeFirst();
    },

    async countRecentForUser(userId: number, since: number): Promise<number> {
      const row = await db
        .selectFrom("password_reset_tokens")
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where("user_id", "=", userId)
        .where("created_at", ">=", since)
        .executeTakeFirstOrThrow();
      return row.count;
    },

    markUsed(id: number, usedAt: number) {
      return db
        .updateTable("password_reset_tokens")
        .set({ used_at: usedAt })
        .where("id", "=", id)
        .execute();
    },

    expireAllForUser(userId: number, now: number) {
      return db
        .updateTable("password_reset_tokens")
        .set({ used_at: now })
        .where("user_id", "=", userId)
        .where("used_at", "is", null)
        .execute();
    },
  };
}

export type PasswordResetTokensRepo = ReturnType<
  typeof createPasswordResetTokensRepo
>;
