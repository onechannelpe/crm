import type { Kysely } from "kysely";

import type {
  Database,
  NewUserTotpFactor,
  NewUserTotpRecoveryCode,
  UserTotpFactor,
  UserTotpRecoveryCode,
} from "~/lib/db/types";

export function createUserTotpFactorsRepo(db: Kysely<Database>) {
  return {
    findByUserId(userId: number): Promise<UserTotpFactor | undefined> {
      return db
        .selectFrom("user_totp_factors")
        .selectAll()
        .where("user_id", "=", userId)
        .executeTakeFirst();
    },

    async createOrRotate(
      userId: number,
      secretEncrypted: string,
    ): Promise<UserTotpFactor> {
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
        } satisfies NewUserTotpFactor)
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

    async markEnabled(userId: number): Promise<void> {
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

    async disable(userId: number): Promise<void> {
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
      userId: number,
      codeHashes: string[],
    ): Promise<UserTotpRecoveryCode[]> {
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
              }) satisfies NewUserTotpRecoveryCode,
          ),
        )
        .execute();
      return db
        .selectFrom("user_totp_recovery_codes")
        .selectAll()
        .where("user_id", "=", userId)
        .execute();
    },

    listUnusedByUser(userId: number): Promise<UserTotpRecoveryCode[]> {
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

    deleteAllByUser(userId: number): Promise<void> {
      return db
        .deleteFrom("user_totp_recovery_codes")
        .where("user_id", "=", userId)
        .execute()
        .then(() => undefined);
    },
  };
}
