import type { Insertable, Kysely } from "kysely";

import type { Database, NotificationDeliveriesTable } from "~/lib/db/types";

type NewNotificationDeliveryRow = Insertable<NotificationDeliveriesTable>;

export function createNotificationDeliveryLogRepo(db: Kysely<Database>) {
  return {
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

    createRecipientsForEmailUsers(params: {
      campaignId: number;
      eventType: string;
      userIds: number[];
      createdAt: number;
    }) {
      if (params.userIds.length === 0) {
        return Promise.resolve();
      }

      return db
        .insertInto("notification_recipients")
        .columns([
          "campaign_id",
          "user_id",
          "channel",
          "address",
          "status",
          "status_reason",
          "created_at",
          "sent_at",
          "failed_at",
        ])
        .expression((eb) =>
          eb
            .selectFrom("users")
            .leftJoin("notification_preferences as prefs", (join) =>
              join
                .onRef("prefs.user_id", "=", "users.id")
                .on("prefs.event_type", "=", params.eventType)
                .on("prefs.channel", "=", "email"),
            )
            .select((selectEb) => [
              selectEb.val(params.campaignId).as("campaign_id"),
              "users.id as user_id",
              selectEb.val("email").as("channel"),
              "users.email as address",
              selectEb.val("pending").as("status"),
              selectEb.val(null).as("status_reason"),
              selectEb.val(params.createdAt).as("created_at"),
              selectEb.val(null).as("sent_at"),
              selectEb.val(null).as("failed_at"),
            ])
            .where("users.id", "in", params.userIds)
            .where("users.is_active", "=", 1)
            .where("users.onboarding_completed_at", "is not", null)
            .where((whereEb) =>
              whereEb.or([
                whereEb("prefs.id", "is", null),
                whereEb("prefs.is_enabled", "=", 1),
              ]),
            ),
        )
        .execute();
    },

    createRecipientsForWhatsAppUsers(params: {
      campaignId: number;
      eventType: string;
      userIds: number[];
      createdAt: number;
    }) {
      if (params.userIds.length === 0) {
        return Promise.resolve();
      }

      return db
        .insertInto("notification_recipients")
        .columns([
          "campaign_id",
          "user_id",
          "channel",
          "address",
          "status",
          "status_reason",
          "created_at",
          "sent_at",
          "failed_at",
        ])
        .expression((eb) =>
          eb
            .selectFrom("users")
            .leftJoin("notification_preferences as prefs", (join) =>
              join
                .onRef("prefs.user_id", "=", "users.id")
                .on("prefs.event_type", "=", params.eventType)
                .on("prefs.channel", "=", "whatsapp"),
            )
            .innerJoin("notification_channel_owners as contacts", (join) =>
              join
                .onRef("contacts.user_id", "=", "users.id")
                .on("contacts.channel", "=", "whatsapp")
                .on("contacts.is_verified", "=", 1),
            )
            .select((selectEb) => [
              selectEb.val(params.campaignId).as("campaign_id"),
              "users.id as user_id",
              selectEb.val("whatsapp").as("channel"),
              "contacts.address_normalized as address",
              selectEb.val("pending").as("status"),
              selectEb.val(null).as("status_reason"),
              selectEb.val(params.createdAt).as("created_at"),
              selectEb.val(null).as("sent_at"),
              selectEb.val(null).as("failed_at"),
            ])
            .where("users.id", "in", params.userIds)
            .where("users.is_active", "=", 1)
            .where("users.onboarding_completed_at", "is not", null)
            .where((whereEb) =>
              whereEb.or([
                whereEb("prefs.id", "is", null),
                whereEb("prefs.is_enabled", "=", 1),
              ]),
            ),
        )
        .execute();
    },
  };
}

export type NotificationDeliveryLogRepo = ReturnType<
  typeof createNotificationDeliveryLogRepo
>;
