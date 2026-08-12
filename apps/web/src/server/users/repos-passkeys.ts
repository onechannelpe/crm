import type { Kysely } from "kysely";

import type { UserId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";

export function createPasskeysRepo(db: Kysely<Database>) {
  return {
    findById(id: string) {
      return db
        .selectFrom("passkeys")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByUser(userId: UserId) {
      return db
        .selectFrom("passkeys")
        .selectAll()
        .where("user_id", "=", userId)
        .execute();
    },

    create(values: {
      id: string;
      user_id: UserId;
      public_key: string;
      counter: number;
      transports: string | null;
      created_at: Date;
    }) {
      return db.insertInto("passkeys").values(values).executeTakeFirstOrThrow();
    },

    async updateCounter(
      id: string,
      expectedCounter: number,
      counter: number,
      usedAt: Date,
    ): Promise<boolean> {
      const result = await db
        .updateTable("passkeys")
        .set({ counter, last_used_at: usedAt })
        .where("id", "=", id)
        .where("counter", "=", expectedCounter)
        .executeTakeFirst();
      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    deleteAllByUser(userId: UserId) {
      return db.deleteFrom("passkeys").where("user_id", "=", userId).execute();
    },
  };
}

export type PasskeysRepo = ReturnType<typeof createPasskeysRepo>;
