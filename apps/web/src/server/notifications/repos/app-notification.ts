import type { Insertable } from "kysely";

import type { AppNotificationsTable } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId, LeadId, BranchId } from "~/server/shared/ids";

type NewAppNotificationRow = Insertable<AppNotificationsTable>;

export function createAppNotificationRepo(db: DatabaseExecutor) {
  return {
    listByUser(userId: UserId, limit: number) {
      return db
        .selectFrom("app_notifications")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .limit(limit)
        .execute();
    },

    async countUnreadByUser(userId: UserId): Promise<number> {
      const row = await db
        .selectFrom("app_notifications")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("user_id", "=", userId)
        .where("read_at", "is", null)
        .executeTakeFirst();
      return row?.count ?? 0;
    },

    async createMany(values: NewAppNotificationRow[]): Promise<void> {
      if (values.length === 0) return;
      await db
        .insertInto("app_notifications")
        .values(values)
        .onConflict((oc) => oc.columns(["user_id", "dedupe_key"]).doNothing())
        .execute();
    },

    markRead(userId: UserId, notificationId: number, readAt: number) {
      return db
        .updateTable("app_notifications")
        .set({ read_at: readAt })
        .where("id", "=", notificationId)
        .where("user_id", "=", userId)
        .where("read_at", "is", null)
        .execute();
    },

    markAllRead(userId: UserId, readAt: number) {
      return db
        .updateTable("app_notifications")
        .set({ read_at: readAt })
        .where("user_id", "=", userId)
        .where("read_at", "is", null)
        .execute();
    },
  };
}

export type AppNotificationRepo = ReturnType<typeof createAppNotificationRepo>;
