import type { Kysely } from "kysely";

import type {
  ActionRateLimitCounter,
  Database,
  NewActionRateLimitCounter,
} from "~/lib/db/schema";

export function createActionRateLimitsRepo(db: Kysely<Database>) {
  return {
    async findByKey(keyHash: string): Promise<ActionRateLimitCounter | null> {
      const row = await db
        .selectFrom("action_rate_limit_counters")
        .selectAll()
        .where("key_hash", "=", keyHash)
        .executeTakeFirst();
      return row ?? null;
    },

    async upsert(values: NewActionRateLimitCounter): Promise<void> {
      await db
        .insertInto("action_rate_limit_counters")
        .values(values)
        .onConflict((oc) =>
          oc.column("key_hash").doUpdateSet({
            window_started_at: values.window_started_at,
            request_count: values.request_count,
            updated_at: values.updated_at,
          }),
        )
        .execute();
    },

    async increment(keyHash: string, updatedAt: number): Promise<void> {
      await db
        .updateTable("action_rate_limit_counters")
        .set((eb) => ({
          request_count: eb("request_count", "+", 1),
          updated_at: updatedAt,
        }))
        .where("key_hash", "=", keyHash)
        .execute();
    },

    async deleteUpdatedBefore(timestamp: number): Promise<number> {
      const result = await db
        .deleteFrom("action_rate_limit_counters")
        .where("updated_at", "<", timestamp)
        .executeTakeFirst();
      return Number(result.numDeletedRows ?? 0);
    },
  };
}

export type ActionRateLimitsRepo = ReturnType<
  typeof createActionRateLimitsRepo
>;
