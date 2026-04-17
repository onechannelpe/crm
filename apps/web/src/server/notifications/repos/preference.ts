import type { Insertable, Kysely } from "kysely";

import type { Database, NotificationPreferencesTable } from "~/lib/db/types";

type NewNotificationPreferenceRow = Insertable<NotificationPreferencesTable>;

type NotificationChannel = NotificationPreferencesTable["channel"];

export function createNotificationPreferenceRepo(db: Kysely<Database>) {
  return {
    async isEnabled(params: {
      userId: number;
      eventType: string;
      channel: NotificationChannel;
    }): Promise<boolean> {
      const preference = await db
        .selectFrom("notification_preferences")
        .select(["is_enabled"])
        .where("user_id", "=", params.userId)
        .where("event_type", "=", params.eventType)
        .where("channel", "=", params.channel)
        .executeTakeFirst();

      if (!preference) {
        return true;
      }

      return preference.is_enabled === 1;
    },

    async upsert(values: NewNotificationPreferenceRow): Promise<void> {
      await db
        .insertInto("notification_preferences")
        .values(values)
        .onConflict((oc) =>
          oc.columns(["user_id", "event_type", "channel"]).doUpdateSet({
            is_enabled: values.is_enabled,
            updated_at: values.updated_at,
          }),
        )
        .execute();
    },
  };
}

export type NotificationPreferenceRepo = ReturnType<
  typeof createNotificationPreferenceRepo
>;
