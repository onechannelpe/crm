import type { Insertable, Kysely, Selectable } from "kysely";

import type { Database } from "~/server/platform/database/types";

type AuthThrottleCounterRow = Selectable<Database["auth_throttle_counters"]>;
type NewAuthThrottleCounterRow = Insertable<Database["auth_throttle_counters"]>;

export type AuthThrottleScope = AuthThrottleCounterRow["scope"];

export function createAuthThrottleRepo(db: Kysely<Database>) {
  return {
    async findByScopeAndKey(
      scope: AuthThrottleScope,
      keyHash: string,
    ): Promise<AuthThrottleCounterRow | null> {
      const row = await db
        .selectFrom("auth_throttle_counters")
        .selectAll()
        .where("scope", "=", scope)
        .where("key_hash", "=", keyHash)
        .executeTakeFirst();
      return row ?? null;
    },

    async upsert(counter: NewAuthThrottleCounterRow): Promise<void> {
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

    async deleteExpiredBlocks(now = new Date()): Promise<number> {
      const result = await db
        .deleteFrom("auth_throttle_counters")
        .where("blocked_until", "is not", null)
        .where("blocked_until", "<", now)
        .executeTakeFirst();

      return Number(result.numDeletedRows ?? 0);
    },

    async deleteUpdatedBefore(timestamp: Date): Promise<number> {
      const result = await db
        .deleteFrom("auth_throttle_counters")
        .where("updated_at", "<", timestamp)
        .executeTakeFirst();

      return Number(result.numDeletedRows ?? 0);
    },
  };
}

export type AuthThrottleRepo = ReturnType<typeof createAuthThrottleRepo>;
