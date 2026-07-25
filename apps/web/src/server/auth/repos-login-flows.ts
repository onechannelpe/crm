import type { Kysely } from "kysely";

import type {
  AuthLoginFlowId,
  UserId,
  WebauthnChallengeId,
} from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";

export function createLoginFlowsRepo(db: Kysely<Database>) {
  return {
    async create(values: {
      identifier: string;
      primary_auth_method: "password" | "google" | "passkey";
      user_id?: UserId | null;
      challenge_id?: WebauthnChallengeId | null;
      state: "totp" | "passkey";
      expires_at: Date;
      created_at: Date;
    }): Promise<AuthLoginFlowId> {
      const inserted = await db
        .insertInto("login_flows")
        .values({
          identifier: values.identifier,
          primary_auth_method: values.primary_auth_method,
          user_id: values.user_id ?? null,
          challenge_id: values.challenge_id ?? null,
          state: values.state,
          expires_at: values.expires_at,
          created_at: values.created_at,
          updated_at: values.created_at,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      return inserted.id;
    },

    findById(id: AuthLoginFlowId) {
      return db
        .selectFrom("login_flows")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findByIdForUpdate(id: AuthLoginFlowId) {
      return db
        .selectFrom("login_flows")
        .selectAll()
        .where("id", "=", id)
        .forUpdate()
        .executeTakeFirst();
    },

    async delete(id: AuthLoginFlowId): Promise<void> {
      await db.deleteFrom("login_flows").where("id", "=", id).execute();
    },

    async deleteExpired(now = new Date()): Promise<number> {
      const result = await db
        .deleteFrom("login_flows")
        .where("expires_at", "<", now)
        .executeTakeFirst();

      return Number(result.numDeletedRows ?? 0);
    },
  };
}

export type LoginFlowsRepo = ReturnType<typeof createLoginFlowsRepo>;
