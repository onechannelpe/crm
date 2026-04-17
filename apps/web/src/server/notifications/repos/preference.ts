import type { Insertable, Kysely } from "kysely";

import type { Database, NotificationPreferencesTable } from "~/lib/db/types";

type NewNotificationPreferenceRow = Insertable<NotificationPreferencesTable>;

export function createNotificationPreferenceRepo(db: Kysely<Database>) {
  return {
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
