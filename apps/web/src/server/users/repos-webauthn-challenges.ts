import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { UserId, WebauthnChallengeId } from "~/server/shared/ids";

export function createWebauthnChallengesRepo(db: Kysely<Database>) {
  return {
    async create(values: {
      user_id: UserId | null;
      type: string;
      challenge: string;
      expires_at: Date;
    }): Promise<WebauthnChallengeId> {
      const now = new Date();
      const inserted = await db
        .insertInto("webauthn_challenges")
        .values({ ...values, created_at: now })
        .returning("id")
        .executeTakeFirstOrThrow();

      return inserted.id;
    },

    findById(id: WebauthnChallengeId) {
      return db
        .selectFrom("webauthn_challenges")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    async delete(id: WebauthnChallengeId): Promise<void> {
      await db.deleteFrom("webauthn_challenges").where("id", "=", id).execute();
    },

    async deleteExpired(now = new Date()): Promise<number> {
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
