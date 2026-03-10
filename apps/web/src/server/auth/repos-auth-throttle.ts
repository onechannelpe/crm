import type { Kysely } from "kysely";

import type {
  AuthThrottleCounter,
  Database,
  NewAuthThrottleCounter,
} from "~/lib/db/types";

export type AuthThrottleScope = AuthThrottleCounter["scope"];

export function createAuthThrottleRepo(db: Kysely<Database>) {
  return {
    async findByScopeAndKey(
      scope: AuthThrottleScope,
      keyHash: string,
    ): Promise<AuthThrottleCounter | null> {
      const row = await db
        .selectFrom("auth_throttle_counters")
        .selectAll()
        .where("scope", "=", scope)
        .where("key_hash", "=", keyHash)
        .executeTakeFirst();
      return row ?? null;
    },

    async upsert(counter: NewAuthThrottleCounter): Promise<void> {
      await db
        .insertInto("auth_throttle_counters")
        .values(counter)
        .onConflict((oc) =>
          oc.columns(["scope", "key_hash"]).doUpdateSet({
            window_started_at: counter.window_started_at,
            failure_count: counter.failure_count,
            blocked_until: counter.blocked_until,
            updated_at: counter.updated_at,
          }),
        )
        .execute();
    },

    async deleteByScopeAndKey(
      scope: AuthThrottleScope,
      keyHash: string,
    ): Promise<void> {
      await db
        .deleteFrom("auth_throttle_counters")
        .where("scope", "=", scope)
        .where("key_hash", "=", keyHash)
        .execute();
    },

    async deleteExpiredBlocks(now = Date.now()): Promise<number> {
      const result = await db
        .deleteFrom("auth_throttle_counters")
        .where("blocked_until", "is not", null)
        .where("blocked_until", "<", now)
        .executeTakeFirst();

      return Number(result.numDeletedRows ?? 0);
    },

    async deleteUpdatedBefore(timestamp: number): Promise<number> {
      const result = await db
        .deleteFrom("auth_throttle_counters")
        .where("updated_at", "<", timestamp)
        .executeTakeFirst();

      return Number(result.numDeletedRows ?? 0);
    },
  };
}

export type AuthThrottleRepo = ReturnType<typeof createAuthThrottleRepo>;
