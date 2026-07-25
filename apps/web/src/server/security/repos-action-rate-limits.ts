import type { Kysely } from "kysely";

import type { Database } from "~/server/platform/database/types";

interface CounterSnapshot {
  request_count: number;
  window_started_at: Date;
}

export function createActionRateLimitsRepo(db: Kysely<Database>) {
  return {
    async checkAndIncrement(
      keyHash: string,
      now: Date,
      windowMs: number,
    ): Promise<CounterSnapshot> {
      const windowCutoff = new Date(now.getTime() - windowMs);
      const row = await db
        .insertInto("action_rate_limit_counters")
        .values({
          key_hash: keyHash,
          window_started_at: now,
          request_count: 1,
          updated_at: now,
        })
        .onConflict((oc) =>
          oc.column("key_hash").doUpdateSet((eb) => ({
            window_started_at: eb
              .case()
              .when(
                "action_rate_limit_counters.window_started_at",
                "<=",
                windowCutoff,
              )
              .then(now)
              .else(eb.ref("action_rate_limit_counters.window_started_at"))
              .end(),
            request_count: eb
              .case()
              .when(
                "action_rate_limit_counters.window_started_at",
                "<=",
                windowCutoff,
              )
              .then(1)
              .else(eb("action_rate_limit_counters.request_count", "+", 1))
              .end(),
            updated_at: now,
          })),
        )
        .returning(["request_count", "window_started_at"])
        .executeTakeFirstOrThrow();

      return row;
    },

    async deleteUpdatedBefore(timestamp: Date): Promise<number> {
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
