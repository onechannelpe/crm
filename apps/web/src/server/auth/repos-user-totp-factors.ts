import type { Insertable, Kysely, Selectable } from "kysely";

import type { UserId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";

type UserTotpFactorRow = Selectable<Database["user_totp_factors"]>;
type NewUserTotpFactorRow = Insertable<Database["user_totp_factors"]>;

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
      changedAt: Date,
    ): Promise<UserTotpFactorRow> {
      await db
        .insertInto("user_totp_factors")
        .values({
          user_id: userId,
          secret_encrypted: secretEncrypted,
          is_enabled: false,
          created_at: changedAt,
          updated_at: changedAt,
          enabled_at: null,
        } satisfies NewUserTotpFactorRow)
        .onConflict((oc) =>
          oc.column("user_id").doUpdateSet({
            secret_encrypted: secretEncrypted,
            is_enabled: false,
            updated_at: changedAt,
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

    async enableIfSecretMatches(
      userId: UserId,
      secretEncrypted: string,
      enabledAt: Date,
    ): Promise<boolean> {
      const result = await db
        .updateTable("user_totp_factors")
        .set({
          is_enabled: true,
          enabled_at: enabledAt,
          updated_at: enabledAt,
        })
        .where("user_id", "=", userId)
        .where("secret_encrypted", "=", secretEncrypted)
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    async disable(userId: UserId, disabledAt: Date): Promise<void> {
      await db
        .updateTable("user_totp_factors")
        .set({
          is_enabled: false,
          enabled_at: null,
          updated_at: disabledAt,
        })
        .where("user_id", "=", userId)
        .execute();
    },
  };
}

export type UserTotpFactorsRepo = ReturnType<typeof createUserTotpFactorsRepo>;
