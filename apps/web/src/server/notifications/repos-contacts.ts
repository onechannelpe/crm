import type { Kysely } from "kysely";

import type {
  Database,
  NewNotificationContact,
  NotificationContactsTable,
} from "~/lib/db/schema";

type NotificationChannel = NotificationContactsTable["channel"];

export function createNotificationContactsRepo(db: Kysely<Database>) {
  return {
    findPrimaryVerifiedByUserAndChannel(
      userId: number,
      channel: NotificationChannel,
    ) {
      return db
        .selectFrom("notification_contacts")
        .selectAll()
        .where("user_id", "=", userId)
        .where("channel", "=", channel)
        .where("is_primary", "=", 1)
        .where("is_verified", "=", 1)
        .executeTakeFirst();
    },

    listByUser(userId: number) {
      return db
        .selectFrom("notification_contacts")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "asc")
        .execute();
    },

    async upsertPrimary(values: NewNotificationContact): Promise<void> {
      const now = Date.now();
      await db
        .deleteFrom("notification_contacts")
        .where("user_id", "=", values.user_id)
        .where("channel", "=", values.channel)
        .execute();

      await db
        .insertInto("notification_contacts")
        .values({
          ...values,
          is_primary: 1,
          updated_at: now,
        })
        .execute();
    },
  };
}

export type NotificationContactsRepo = ReturnType<
  typeof createNotificationContactsRepo
>;
