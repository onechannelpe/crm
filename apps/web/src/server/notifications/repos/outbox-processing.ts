import type { Kysely, Selectable } from "kysely";

import type { Database, NotificationOutboxTable } from "~/lib/db/types";

export type ProcessableNotification = Selectable<NotificationOutboxTable>;

export interface NotificationOutboxProcessingRepository {
  lease(input: {
    workerId: string;
    now: number;
    limit: number;
  }): Promise<ProcessableNotification[]>;
  markDone(id: string, now: number): Promise<void>;
  markFailed(id: string, error: unknown, now: number): Promise<void>;
  countOutstanding(): Promise<number>;
}

export function createNotificationOutboxProcessingRepository(
  db: Kysely<Database>,
): NotificationOutboxProcessingRepository {
  return {
    async lease({ workerId, now, limit }) {
      const candidates = await db
        .selectFrom("notification_outbox")
        .select("id")
        .where("status", "=", "pending")
        .where("available_at", "<=", now)
        .where((eb) =>
          eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
        )
        .orderBy("created_at", "asc")
        .limit(limit)
        .execute();
      if (candidates.length === 0) return [];

      const ids = candidates.map(({ id }) => id);
      await db
        .updateTable("notification_outbox")
        .set((eb) => ({
          status: "processing",
          lease_owner: workerId,
          lease_until: now + 30_000,
          attempt_count: eb("attempt_count", "+", 1),
        }))
        .where("id", "in", ids)
        .where("status", "=", "pending")
        .execute();

      return db
        .selectFrom("notification_outbox")
        .selectAll()
        .where("id", "in", ids)
        .where("lease_owner", "=", workerId)
        .execute();
    },

    async markDone(id, now) {
      await db
        .updateTable("notification_outbox")
        .set({
          status: "done",
          processed_at: now,
          lease_owner: null,
          lease_until: null,
          error: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async markFailed(id, error, now) {
      await db
        .updateTable("notification_outbox")
        .set({
          status: "failed",
          processed_at: now,
          lease_owner: null,
          lease_until: null,
          error: String(error),
        })
        .where("id", "=", id)
        .execute();
    },

    async countOutstanding() {
      const row = await db
        .selectFrom("notification_outbox")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("status", "in", ["pending", "processing"])
        .executeTakeFirstOrThrow();
      return row.count;
    },
  };
}
