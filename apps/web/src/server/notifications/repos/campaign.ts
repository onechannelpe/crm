import type { Insertable, Kysely } from "kysely";

import type { Database, NotificationCampaignsTable } from "~/lib/db/types";

type NewNotificationCampaignRow = Insertable<NotificationCampaignsTable>;

export type NotificationAudienceType =
  NotificationCampaignsTable["audience_type"];

export function createNotificationCampaignRepo(db: Kysely<Database>) {
  return {
    async createCampaign(values: NewNotificationCampaignRow): Promise<number> {
      const result = await db
        .insertInto("notification_campaigns")
        .values(values)
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    markProcessing(campaignId: number) {
      return db
        .updateTable("notification_campaigns")
        .set({ status: "processing" })
        .where("id", "=", campaignId)
        .where("status", "=", "queued")
        .executeTakeFirst();
    },

    markCompleted(campaignId: number, processedAt: number) {
      return db
        .updateTable("notification_campaigns")
        .set({ status: "completed", processed_at: processedAt })
        .where("id", "=", campaignId)
        .execute();
    },

    markFailed(campaignId: number, processedAt: number) {
      return db
        .updateTable("notification_campaigns")
        .set({ status: "failed", processed_at: processedAt })
        .where("id", "=", campaignId)
        .execute();
    },

    findQueuedCampaigns(now: number, limit: number) {
      return db
        .selectFrom("notification_campaigns")
        .selectAll()
        .where("status", "=", "queued")
        .where((eb) =>
          eb.or([
            eb("scheduled_at", "is", null),
            eb("scheduled_at", "<=", now),
          ]),
        )
        .orderBy("created_at", "asc")
        .limit(limit)
        .execute();
    },
  };
}

export type NotificationCampaignRepo = ReturnType<
  typeof createNotificationCampaignRepo
>;
