import { sql, type Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

interface CounterSnapshot {
  request_count: number;
  window_started_at: number;
}

export function createActionRateLimitsRepo(db: Kysely<Database>) {
  return {
    async checkAndIncrement(
      keyHash: string,
      now: number,
      windowMs: number,
    ): Promise<CounterSnapshot> {
      const rows = await sql<CounterSnapshot>`
        INSERT INTO action_rate_limit_counters (key_hash, window_started_at, request_count, updated_at)
        VALUES (${keyHash}, ${now}, 1, ${now})
        ON CONFLICT (key_hash) DO UPDATE SET
          window_started_at = CASE WHEN (${now} - window_started_at) >= ${windowMs}
                                   THEN ${now} ELSE window_started_at END,
          request_count     = CASE WHEN (${now} - window_started_at) >= ${windowMs}
                                   THEN 1 ELSE request_count + 1 END,
          updated_at        = ${now}
        RETURNING request_count, window_started_at
      `.execute(db);
      const row = rows.rows[0];
      if (!row) throw new Error("Rate limit counter write returned no row");
      return row;
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
