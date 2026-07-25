import type { Kysely } from "kysely";

import type { UserId, WebauthnChallengeId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";

export function createWebauthnChallengesRepo(db: Kysely<Database>) {
  return {
    async create(values: {
      user_id: UserId | null;
      type: string;
      challenge: string;
      expires_at: Date;
      created_at: Date;
    }): Promise<WebauthnChallengeId> {
      const inserted = await db
        .insertInto("webauthn_challenges")
        .values(values)
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

    async consume(id: WebauthnChallengeId): Promise<boolean> {
      const deleted = await db
        .deleteFrom("webauthn_challenges")
        .where("id", "=", id)
        .returning("id")
        .executeTakeFirst();
      return deleted !== undefined;
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
