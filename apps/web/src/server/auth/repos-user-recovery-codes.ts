import type { RecoveryCodeSetSource } from "~/lib/db/schema/modules/auth.types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";

type ActiveRecoveryCodeSet = {
  createdAt: Date;
  acknowledgedAt: Date | null;
  total: number;
  unused: number;
};

async function insertSet(
  executor: DatabaseExecutor,
  userId: UserId,
  source: RecoveryCodeSetSource,
  codeHashes: string[],
  createdAt: Date,
): Promise<void> {
  const set = await executor
    .insertInto("recovery_code_set")
    .values({
      user_id: userId,
      source,
      created_at: createdAt,
      acknowledged_at: null,
      revoked_at: null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  await executor
    .insertInto("recovery_code")
    .values(
      codeHashes.map((code_hash) => ({
        set_id: set.id,
        code_hash,
        used_at: null,
      })),
    )
    .execute();
}

// An active set serves both TOTP and passkey. This repository owns atomic
// single-use consumption rather than leaving a read-then-write race to callers.
export function createUserRecoveryCodesRepo(db: DatabaseExecutor) {
  function activeSetIds(userId: UserId) {
    return db
      .selectFrom("recovery_code_set")
      .select("id")
      .where("user_id", "=", userId)
      .where("revoked_at", "is", null);
  }

  return {
    // Call only after checking for an active set; the partial unique index
    // rejects a concurrent duplicate.
    issueSet(
      userId: UserId,
      source: RecoveryCodeSetSource,
      codeHashes: string[],
      createdAt: Date,
    ): Promise<void> {
      return insertSet(db, userId, source, codeHashes, createdAt);
    },

    async replaceSet(
      userId: UserId,
      codeHashes: string[],
      replacedAt: Date,
    ): Promise<void> {
      await db
        .updateTable("recovery_code_set")
        .set({ revoked_at: replacedAt })
        .where("user_id", "=", userId)
        .where("revoked_at", "is", null)
        .execute();
      await insertSet(db, userId, "regenerate", codeHashes, replacedAt);
    },

    async getActiveSet(userId: UserId): Promise<ActiveRecoveryCodeSet | null> {
      const set = await db
        .selectFrom("recovery_code_set")
        .select(["id", "created_at", "acknowledged_at"])
        .where("user_id", "=", userId)
        .where("revoked_at", "is", null)
        .executeTakeFirst();

      if (!set) {
        return null;
      }

      const codes = await db
        .selectFrom("recovery_code")
        .select("used_at")
        .where("set_id", "=", set.id)
        .execute();

      return {
        createdAt: set.created_at,
        acknowledgedAt: set.acknowledged_at,
        total: codes.length,
        unused: codes.filter((code) => code.used_at === null).length,
      };
    },

    // Atomic single-use: consumes one unused code that matches `codeHash` inside
    // the user's active set. The 0-or-1 affected rows is the verdict, so there is
    // no read-then-mark race and a superseded (revoked) set is never redeemable.
    async consumeActiveCode(
      userId: UserId,
      codeHash: string,
      consumedAt: Date,
    ): Promise<boolean> {
      const consumed = await db
        .updateTable("recovery_code")
        .set({ used_at: consumedAt })
        .where("code_hash", "=", codeHash)
        .where("used_at", "is", null)
        .where("set_id", "in", activeSetIds(userId))
        .returning("id")
        .executeTakeFirst();

      return consumed !== undefined;
    },

    async acknowledgeActiveSet(
      userId: UserId,
      acknowledgedAt: Date,
    ): Promise<boolean> {
      const acknowledged = await db
        .updateTable("recovery_code_set")
        .set({ acknowledged_at: acknowledgedAt })
        .where("user_id", "=", userId)
        .where("revoked_at", "is", null)
        .where("acknowledged_at", "is", null)
        .returning("id")
        .executeTakeFirst();
      return acknowledged !== undefined;
    },

    deleteAllByUser(userId: UserId): Promise<void> {
      return db
        .deleteFrom("recovery_code_set")
        .where("user_id", "=", userId)
        .execute()
        .then(() => undefined);
    },
  };
}

export type UserRecoveryCodesRepo = ReturnType<
  typeof createUserRecoveryCodesRepo
>;
