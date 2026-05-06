import type { Insertable, Kysely } from "kysely";

import type { Database, NotificationChannelOwnersTable } from "~/lib/db/types";

type NewNotificationChannelOwnerRow = Insertable<NotificationChannelOwnersTable>;

export function createNotificationContactRepo(db: Kysely<Database>) {
  return {
    listByUser(userId: number) {
      return db
        .selectFrom("notification_channel_owners")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "asc")
        .execute();
    },

    getByUserChannel(userId: number, channel: "whatsapp") {
      return db
        .selectFrom("notification_channel_owners")
        .selectAll()
        .where("user_id", "=", userId)
        .where("channel", "=", channel)
        .executeTakeFirst();
    },

    async claim(
      values: NewNotificationChannelOwnerRow & { channel: "whatsapp" },
    ): Promise<void> {
      const now = Date.now();
      await db
        .deleteFrom("notification_channel_owners")
        .where("user_id", "=", values.user_id)
        .where("channel", "=", values.channel)
        .execute();

      await db
        .insertInto("notification_channel_owners")
        .values({
          ...values,
          updated_at: now,
        })
        .execute();
    },
  };
}

export type NotificationContactRepo = ReturnType<
  typeof createNotificationContactRepo
>;
