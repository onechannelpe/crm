import type { Insertable, Kysely, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { UserId } from "~/server/shared/ids";

type UserTotpFactorRow = Selectable<Database["user_totp_factors"]>;
type NewUserTotpFactorRow = Insertable<Database["user_totp_factors"]>;
type UserTotpRecoveryCodeRow = Selectable<Database["user_totp_recovery_codes"]>;
type NewUserTotpRecoveryCodeRow = Insertable<
  Database["user_totp_recovery_codes"]
>;

export function createUserTotpFactorsRepo(db: Kysely<Database>) {
  return {
    findByUserId(userId: UserId): Promise<UserTotpFactorRow | undefined> {
      return db
        .selectFrom("user_totp_factors")
        .selectAll()
        .where("user_id", "=", userId)
        .executeTakeFirst();
    },

    async createOrRotate(
      userId: UserId,
      secretEncrypted: string,
    ): Promise<UserTotpFactorRow> {
      const now = Date.now();
      await db
        .insertInto("user_totp_factors")
        .values({
          user_id: userId,
          secret_encrypted: secretEncrypted,
          is_enabled: 0,
          created_at: now,
          updated_at: now,
          enabled_at: null,
        } satisfies NewUserTotpFactorRow)
        .onConflict((oc) =>
          oc.column("user_id").doUpdateSet({
            secret_encrypted: secretEncrypted,
            is_enabled: 0,
            updated_at: now,
            enabled_at: null,
          }),
        )
        .executeTakeFirstOrThrow();

      return db
        .selectFrom("user_totp_factors")
        .selectAll()
        .where("user_id", "=", userId)
        .executeTakeFirstOrThrow();
    },

    async markEnabled(userId: UserId): Promise<void> {
      const now = Date.now();
      await db
        .updateTable("user_totp_factors")
        .set({
          is_enabled: 1,
          enabled_at: now,
          updated_at: now,
        })
        .where("user_id", "=", userId)
        .execute();
    },

    async disable(userId: UserId): Promise<void> {
      const now = Date.now();
      await db
        .updateTable("user_totp_factors")
        .set({
          is_enabled: 0,
          enabled_at: null,
          updated_at: now,
        })
        .where("user_id", "=", userId)
        .execute();
    },
  };
}

export function createUserTotpRecoveryCodesRepo(db: Kysely<Database>) {
  return {
    async replaceForUser(
      userId: UserId,
      codeHashes: string[],
    ): Promise<UserTotpRecoveryCodeRow[]> {
      await db
        .deleteFrom("user_totp_recovery_codes")
        .where("user_id", "=", userId)
        .execute();
      const now = Date.now();
      await db
        .insertInto("user_totp_recovery_codes")
        .values(
          codeHashes.map(
            (code_hash) =>
              ({
                user_id: userId,
                code_hash,
                used_at: null,
                created_at: now,
              }) satisfies NewUserTotpRecoveryCodeRow,
          ),
        )
        .execute();
      return db
        .selectFrom("user_totp_recovery_codes")
        .selectAll()
        .where("user_id", "=", userId)
        .execute();
    },

    listUnusedByUser(userId: UserId): Promise<UserTotpRecoveryCodeRow[]> {
      return db
        .selectFrom("user_totp_recovery_codes")
        .selectAll()
        .where("user_id", "=", userId)
        .where("used_at", "is", null)
        .execute();
    },

    markUsed(id: number): Promise<void> {
      return db
        .updateTable("user_totp_recovery_codes")
        .set({ used_at: Date.now() })
        .where("id", "=", id)
        .where("used_at", "is", null)
        .execute()
        .then(() => undefined);
    },

    deleteAllByUser(userId: UserId): Promise<void> {
      return db
        .deleteFrom("user_totp_recovery_codes")
        .where("user_id", "=", userId)
        .execute()
        .then(() => undefined);
    },
  };
}

export type UserTotpFactorsRepo = ReturnType<typeof createUserTotpFactorsRepo>;
