import type { Kysely } from "kysely";

import { isRole } from "~/lib/auth/access/rbac";
import type {
  Database,
  NewNotificationCampaign,
  NewNotificationDelivery,
  NewNotificationJob,
  NewNotificationRecipient,
  NotificationCampaignsTable,
  UsersTable,
} from "~/lib/db/types";

export interface AudienceUser {
  id: number;
  email: string;
  role: UsersTable["role"];
}

export type AudienceType = NotificationCampaignsTable["audience_type"];

export function createNotificationCampaignsRepo(db: Kysely<Database>) {
  return {
    async createCampaign(values: NewNotificationCampaign): Promise<number> {
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

    findAudienceUsers(audienceType: AudienceType, audienceRef: string | null) {
      const base = db
        .selectFrom("users")
        .select(["id", "email", "role"])
        .where("is_active", "=", 1)
        .where("onboarding_completed_at", "is not", null);

      if (audienceType === "global") {
        return base.execute();
      }

      if (audienceType === "role") {
        if (!audienceRef) {
          return Promise.resolve([] as AudienceUser[]);
        }

        if (!isRole(audienceRef)) {
          return Promise.resolve([] as AudienceUser[]);
        }

        return base.where("role", "=", audienceRef).execute();
      }

      if (!audienceRef) {
        return Promise.resolve([] as AudienceUser[]);
      }

      const userId = Number(audienceRef);
      if (!Number.isInteger(userId) || userId <= 0) {
        return Promise.resolve([] as AudienceUser[]);
      }

      return base.where("id", "=", userId).execute();
    },

    async createRecipient(values: NewNotificationRecipient): Promise<number> {
      const result = await db
        .insertInto("notification_recipients")
        .values(values)
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    createJob(values: NewNotificationJob) {
      return db.insertInto("notification_jobs").values(values).execute();
    },

    findPendingJobs(now: number, limit: number) {
      return db
        .selectFrom("notification_jobs")
        .innerJoin(
          "notification_recipients",
          "notification_recipients.id",
          "notification_jobs.recipient_id",
        )
        .innerJoin(
          "notification_campaigns",
          "notification_campaigns.id",
          "notification_recipients.campaign_id",
        )
        .select([
          "notification_jobs.id as jobId",
          "notification_jobs.recipient_id as recipientId",
          "notification_jobs.attempt_count as attemptCount",
          "notification_recipients.channel as channel",
          "notification_recipients.address as address",
          "notification_recipients.user_id as userId",
          "notification_recipients.campaign_id as campaignId",
          "notification_campaigns.event_type as eventType",
          "notification_campaigns.title as title",
          "notification_campaigns.body_text as bodyText",
        ])
        .where("notification_jobs.status", "=", "pending")
        .where("notification_jobs.available_at", "<=", now)
        .where((eb) =>
          eb.or([
            eb("notification_jobs.lease_until", "is", null),
            eb("notification_jobs.lease_until", "<", now),
          ]),
        )
        .orderBy("notification_jobs.available_at", "asc")
        .limit(limit)
        .execute();
    },

    leaseJob(jobId: number, leaseUntil: number) {
      return db
        .updateTable("notification_jobs")
        .set({
          status: "leased",
          lease_until: leaseUntil,
          updated_at: Date.now(),
        })
        .where("id", "=", jobId)
        .where("status", "=", "pending")
        .executeTakeFirst();
    },

    markJobSent(jobId: number) {
      return db
        .updateTable("notification_jobs")
        .set({ status: "sent", lease_until: null, updated_at: Date.now() })
        .where("id", "=", jobId)
        .execute();
    },

    scheduleJobRetry(params: {
      jobId: number;
      availableAt: number;
      attemptCount: number;
      error: string;
    }) {
      return db
        .updateTable("notification_jobs")
        .set({
          status: "pending",
          attempt_count: params.attemptCount,
          available_at: params.availableAt,
          lease_until: null,
          last_error: params.error,
          updated_at: Date.now(),
        })
        .where("id", "=", params.jobId)
        .execute();
    },

    markJobFailed(jobId: number, error: string, attemptCount: number) {
      return db
        .updateTable("notification_jobs")
        .set({
          status: "failed",
          attempt_count: attemptCount,
          lease_until: null,
          last_error: error,
          updated_at: Date.now(),
        })
        .where("id", "=", jobId)
        .execute();
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

    createDelivery(values: NewNotificationDelivery) {
      return db.insertInto("notification_deliveries").values(values).execute();
    },

    countOpenJobsForCampaign(campaignId: number) {
      return db
        .selectFrom("notification_jobs")
        .innerJoin(
          "notification_recipients",
          "notification_recipients.id",
          "notification_jobs.recipient_id",
        )
        .select((eb) => eb.fn.count<number>("notification_jobs.id").as("count"))
        .where("notification_recipients.campaign_id", "=", campaignId)
        .where("notification_jobs.status", "in", ["pending", "leased"])
        .executeTakeFirst()
        .then((row) => Number(row?.count ?? 0));
    },
  };
}

export type NotificationCampaignsRepo = ReturnType<
  typeof createNotificationCampaignsRepo
>;
