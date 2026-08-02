import type { Kysely } from "kysely";

import type { UserId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";

export function createPasswordResetTokensRepo(db: Kysely<Database>) {
  return {
    create(values: {
      user_id: UserId;
      token_hash: string;
      expires_at: Date;
      created_at: Date;
    }) {
      return db
        .insertInto("password_reset_tokens")
        .values({ ...values, used_at: null })
        .execute();
    },

    findValidByHash(tokenHash: string, activeAsOf: Date) {
      return db
        .selectFrom("password_reset_tokens")
        .selectAll()
        .where("token_hash", "=", tokenHash)
        .where("expires_at", ">", activeAsOf)
        .where("used_at", "is", null)
        .executeTakeFirst();
    },

    async countRecentForUser(userId: UserId, since: Date): Promise<number> {
      const row = await db
        .selectFrom("password_reset_tokens")
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where("user_id", "=", userId)
        .where("created_at", ">=", since)
        .executeTakeFirstOrThrow();
      return row.count;
    },

    markUsed(id: string, usedAt: Date) {
      return db
        .updateTable("password_reset_tokens")
        .set({ used_at: usedAt })
        .where("id", "=", id)
        .execute();
    },

    expireAllForUser(userId: UserId, expiredAt: Date) {
      return db
        .updateTable("password_reset_tokens")
        .set({ used_at: expiredAt })
        .where("user_id", "=", userId)
        .where("used_at", "is", null)
        .execute();
    },
  };
}

export type PasswordResetTokensRepo = ReturnType<
  typeof createPasswordResetTokensRepo
>;
