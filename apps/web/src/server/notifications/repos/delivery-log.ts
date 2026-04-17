import type { Insertable, Kysely } from "kysely";

import type {
  Database,
  NotificationDeliveriesTable,
  NotificationRecipientsTable,
} from "~/lib/db/types";

type NewNotificationRecipientRow = Insertable<NotificationRecipientsTable>;
type NewNotificationDeliveryRow = Insertable<NotificationDeliveriesTable>;

export function createNotificationDeliveryLogRepo(db: Kysely<Database>) {
  return {
    async createRecipient(
      values: NewNotificationRecipientRow,
    ): Promise<number> {
      const result = await db
        .insertInto("notification_recipients")
        .values(values)
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    markRecipientSent(recipientId: number, sentAt: number) {
      return db
        .updateTable("notification_recipients")
        .set({ status: "sent", sent_at: sentAt, status_reason: null })
        .where("id", "=", recipientId)
        .execute();
    },

    markRecipientFailed(recipientId: number, failedAt: number, reason: string) {
      return db
        .updateTable("notification_recipients")
        .set({ status: "failed", failed_at: failedAt, status_reason: reason })
        .where("id", "=", recipientId)
        .execute();
    },

    createDelivery(values: NewNotificationDeliveryRow) {
      return db.insertInto("notification_deliveries").values(values).execute();
    },
  };
}

export type NotificationDeliveryLogRepo = ReturnType<
  typeof createNotificationDeliveryLogRepo
>;
