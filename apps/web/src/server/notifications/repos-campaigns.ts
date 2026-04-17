import { sql, type Insertable, type Kysely } from "kysely";

import { isRole } from "~/lib/auth/access/rbac";
import type {
  Database,
  NotificationCampaignsTable,
  NotificationDeliveriesTable,
  NotificationJobsTable,
  NotificationRecipientsTable,
  UsersTable,
} from "~/lib/db/types";

type NewNotificationCampaignRow = Insertable<NotificationCampaignsTable>;
type NewNotificationRecipientRow = Insertable<NotificationRecipientsTable>;
type NewNotificationJobRow = Insertable<NotificationJobsTable>;
type NewNotificationDeliveryRow = Insertable<NotificationDeliveriesTable>;

export interface AudienceUser {
  id: number;
  email: string;
  role: UsersTable["role"];
}

export interface NotificationDeliveryJob {
  id: number;
  recipientId: number;
  channel: "email" | "whatsapp";
  address: string;
  title: string | null;
  bodyText: string;
  attempt_count: number;
  max_attempts: number;
}

export type AudienceType = NotificationCampaignsTable["audience_type"];

export function createNotificationCampaignsRepo(db: Kysely<Database>) {
  async function selectLeasedJobById(
    jobId: number,
    workerId: string,
  ): Promise<NotificationDeliveryJob | null> {
    const row = await db
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
        "notification_jobs.id as id",
        "notification_jobs.recipient_id as recipientId",
        "notification_jobs.attempt_count as attempt_count",
        "notification_jobs.max_attempts as max_attempts",
        "notification_recipients.channel as channel",
        "notification_recipients.address as address",
        "notification_campaigns.title as title",
        "notification_campaigns.body_text as bodyText",
      ])
      .where("notification_jobs.id", "=", jobId)
      .where("notification_jobs.status", "=", "leased")
      .where("notification_jobs.lease_owner", "=", workerId)
      .executeTakeFirst();

    return row ?? null;
  }

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

    async findAudienceUsers(
      audienceType: AudienceType,
      audienceRef: string | null,
    ): Promise<AudienceUser[]> {
      const base = db
        .selectFrom("users")
        .select(["id", "email", "role"])
        .where("is_active", "=", 1)
        .where("onboarding_completed_at", "is not", null);

      if (audienceType === "global") {
        return base.execute();
      }

      if (audienceType === "role") {
        if (!audienceRef || !isRole(audienceRef)) {
          return [];
        }

        return base.where("role", "=", audienceRef).execute();
      }

      if (!audienceRef) {
        return [];
      }

      const userId = Number(audienceRef);
      if (!Number.isInteger(userId) || userId <= 0) {
        return [];
      }

      return base.where("id", "=", userId).execute();
    },

    async createRecipient(
      values: NewNotificationRecipientRow,
    ): Promise<number> {
      const result = await db
        .insertInto("notification_recipients")
        .values(values)
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    createJob(values: NewNotificationJobRow) {
      return db.insertInto("notification_jobs").values(values).execute();
    },

    async claimPendingJobsByChannel(params: {
      channel: "email" | "whatsapp";
      workerId: string;
      limit: number;
      leaseMs: number;
    }): Promise<NotificationDeliveryJob[]> {
      const now = Date.now();
      const leaseUntil = now + params.leaseMs;
      const candidates = await db
        .selectFrom("notification_jobs")
        .innerJoin(
          "notification_recipients",
          "notification_recipients.id",
          "notification_jobs.recipient_id",
        )
        .select(["notification_jobs.id as id"])
        .where("notification_jobs.status", "=", "pending")
        .where("notification_recipients.channel", "=", params.channel)
        .where("notification_jobs.available_at", "<=", now)
        .where((eb) =>
          eb.or([
            eb("notification_jobs.lease_until", "is", null),
            eb("notification_jobs.lease_until", "<", now),
          ]),
        )
        .orderBy("notification_jobs.available_at", "asc")
        .limit(params.limit)
        .execute();

      const leased = await Promise.all(
        candidates.map(async ({ id }) => {
          const updated = await db
            .updateTable("notification_jobs")
            .set({
              status: "leased",
              lease_owner: params.workerId,
              lease_until: leaseUntil,
              last_error: null,
              attempt_count: sql<number>`attempt_count + 1`,
              updated_at: now,
            })
            .where("id", "=", id)
            .where("status", "=", "pending")
            .where((eb) =>
              eb.or([
                eb("lease_until", "is", null),
                eb("lease_until", "<", now),
              ]),
            )
            .executeTakeFirst();

          if (Number(updated.numUpdatedRows ?? 0) === 0) {
            return null;
          }

          return selectLeasedJobById(id, params.workerId);
        }),
      );

      return leased.filter(
        (job): job is NotificationDeliveryJob => job !== null,
      );
    },

    async extendJobLease(
      jobId: number,
      workerId: string,
      leaseMs: number,
    ): Promise<boolean> {
      const result = await db
        .updateTable("notification_jobs")
        .set({
          lease_until: Date.now() + leaseMs,
          updated_at: Date.now(),
        })
        .where("id", "=", jobId)
        .where("status", "=", "leased")
        .where("lease_owner", "=", workerId)
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    markJobSent(jobId: number, workerId: string) {
      return db
        .updateTable("notification_jobs")
        .set({
          status: "sent",
          lease_owner: null,
          lease_until: null,
          updated_at: Date.now(),
        })
        .where("id", "=", jobId)
        .where("status", "=", "leased")
        .where("lease_owner", "=", workerId)
        .execute();
    },

    scheduleJobRetry(params: {
      jobId: number;
      workerId: string;
      availableAt: number;
      error: string;
    }) {
      return db
        .updateTable("notification_jobs")
        .set({
          status: "pending",
          available_at: params.availableAt,
          lease_owner: null,
          lease_until: null,
          last_error: params.error,
          updated_at: Date.now(),
        })
        .where("id", "=", params.jobId)
        .where("status", "=", "leased")
        .where("lease_owner", "=", params.workerId)
        .execute();
    },

    markJobFailed(jobId: number, workerId: string, error: string) {
      return db
        .updateTable("notification_jobs")
        .set({
          status: "failed",
          lease_owner: null,
          lease_until: null,
          last_error: error,
          updated_at: Date.now(),
        })
        .where("id", "=", jobId)
        .where("status", "=", "leased")
        .where("lease_owner", "=", workerId)
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

    createDelivery(values: NewNotificationDeliveryRow) {
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
        .then((row) => row?.count ?? 0);
    },
  };
}

export type NotificationCampaignsRepo = ReturnType<
  typeof createNotificationCampaignsRepo
>;
