import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { UserId } from "~/server/shared/ids";

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
    }) {
      return db
        .insertInto("passkeys")
        .values({ ...values, created_at: new Date() })
        .executeTakeFirstOrThrow();
    },

    updateCounter(id: string, counter: number) {
      return db
        .updateTable("passkeys")
        .set({ counter, last_used_at: new Date() })
        .where("id", "=", id)
        .execute();
    },

    deleteAllByUser(userId: UserId) {
      return db.deleteFrom("passkeys").where("user_id", "=", userId).execute();
    },
  };
}

export type PasskeysRepo = ReturnType<typeof createPasskeysRepo>;
