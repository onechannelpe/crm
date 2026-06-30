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
      const now = new Date();
      await db
        .insertInto("user_totp_factors")
        .values({
          user_id: userId,
          secret_encrypted: secretEncrypted,
          is_enabled: false,
          created_at: now,
          updated_at: now,
          enabled_at: null,
        } satisfies NewUserTotpFactorRow)
        .onConflict((oc) =>
          oc.column("user_id").doUpdateSet({
            secret_encrypted: secretEncrypted,
            is_enabled: false,
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
      const now = new Date();
      await db
        .updateTable("user_totp_factors")
        .set({
          is_enabled: true,
          enabled_at: now,
          updated_at: now,
        })
        .where("user_id", "=", userId)
        .execute();
    },

    async disable(userId: UserId): Promise<void> {
      const now = new Date();
      await db
        .updateTable("user_totp_factors")
        .set({
          is_enabled: false,
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
      const now = new Date();
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

    markUsed(id: string): Promise<void> {
      return db
        .updateTable("user_totp_recovery_codes")
        .set({ used_at: new Date() })
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
export type UserTotpRecoveryCodesRepo = ReturnType<
  typeof createUserTotpRecoveryCodesRepo
>;
