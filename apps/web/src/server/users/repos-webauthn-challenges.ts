import type { Kysely, Selectable } from "kysely";

import type { Database, WebauthnChallengesTable } from "~/lib/db/types";
import type { UserId } from "~/server/shared/ids";

export function createWebauthnChallengesRepo(db: Kysely<Database>) {
  return {
    async create(values: {
      user_id: UserId | null;
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
        .executeTakeFirst() as Promise<
        | (Omit<Selectable<WebauthnChallengesTable>, "user_id"> & {
            user_id: UserId | null;
          })
        | undefined
      >;
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
export type WebauthnChallengesRepo = ReturnType<
  typeof createWebauthnChallengesRepo
>;
