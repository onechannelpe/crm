import type { Insertable, Kysely } from "kysely";

import type { Database, NotificationContactsTable } from "~/lib/db/types";

type NewNotificationContactRow = Insertable<NotificationContactsTable>;

export function createNotificationContactRepo(db: Kysely<Database>) {
  return {
    listByUser(userId: number) {
      return db
        .selectFrom("notification_contacts")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "asc")
        .execute();
    },

    async upsertPrimary(values: NewNotificationContactRow): Promise<void> {
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

export type NotificationContactRepo = ReturnType<
  typeof createNotificationContactRepo
>;
