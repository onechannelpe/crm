import { sql, type Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { type UserId } from "~/server/shared/ids";

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

export function createNotificationDeliveryJobRepo(db: Kysely<Database>) {
  return {
    createPendingJobsForCampaignUsers(params: {
      campaignId: number;
      userIds: UserId[];
      createdAt: number;
      maxAttempts: number;
    }) {
      if (params.userIds.length === 0) {
        return Promise.resolve();
      }

      return db
        .insertInto("notification_jobs")
        .columns([
          "recipient_id",
          "status",
          "attempt_count",
          "max_attempts",
          "available_at",
          "lease_owner",
          "lease_until",
          "last_error",
          "created_at",
          "updated_at",
        ])
        .expression((eb) =>
          eb
            .selectFrom("notification_recipients")
            .leftJoin(
              "notification_jobs",
              "notification_jobs.recipient_id",
              "notification_recipients.id",
            )
            .select((selectEb) => [
              "notification_recipients.id as recipient_id",
              selectEb.val("pending").as("status"),
              selectEb.val(0).as("attempt_count"),
              selectEb.val(params.maxAttempts).as("max_attempts"),
              selectEb.val(params.createdAt).as("available_at"),
              selectEb.val(null).as("lease_owner"),
              selectEb.val(null).as("lease_until"),
              selectEb.val(null).as("last_error"),
              selectEb.val(params.createdAt).as("created_at"),
              selectEb.val(params.createdAt).as("updated_at"),
            ])
            .where(
              "notification_recipients.campaign_id",
              "=",
              params.campaignId,
            )
            .where("notification_recipients.created_at", "=", params.createdAt)
            .where("notification_recipients.user_id", "in", params.userIds)
            .where("notification_jobs.id", "is", null),
        )
        .execute();
    },

    async claimPendingJobsByChannel(params: {
      channel: "email" | "whatsapp";
      workerId: UserId;
      limit: number;
      leaseMs: number;
    }): Promise<NotificationDeliveryJob[]> {
      const now = Date.now();
      const leaseUntil = now + params.leaseMs;

      return db.transaction().execute(async (trx) => {
        const candidates = await trx
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

        const candidateIds = candidates.map((candidate) => candidate.id);
        if (candidateIds.length === 0) {
          return [];
        }

        await trx
          .updateTable("notification_jobs")
          .set({
            status: "leased",
            lease_owner: params.workerId,
            lease_until: leaseUntil,
            last_error: null,
            attempt_count: sql<number>`attempt_count + 1`,
            updated_at: now,
          })
          .where("id", "in", candidateIds)
          .where("status", "=", "pending")
          .where((eb) =>
            eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
          )
          .execute();

        return trx
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
          .where("notification_jobs.id", "in", candidateIds)
          .where("notification_jobs.status", "=", "leased")
          .where("notification_jobs.lease_owner", "=", params.workerId)
          .orderBy("notification_jobs.available_at", "asc")
          .execute();
      });
    },

    async extendJobLease(
      jobId: number,
      workerId: UserId,
      leaseMs: number,
    ): Promise<boolean> {
      const now = Date.now();
      const result = await db
        .updateTable("notification_jobs")
        .set({
          lease_until: now + leaseMs,
          updated_at: now,
        })
        .where("id", "=", jobId)
        .where("status", "=", "leased")
        .where("lease_owner", "=", workerId)
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    markJobSent(jobId: number, workerId: UserId) {
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
      workerId: UserId;
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

    markJobFailed(jobId: number, workerId: UserId, error: string) {
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
  };
}

export type NotificationDeliveryJobRepo = ReturnType<
  typeof createNotificationDeliveryJobRepo
>;
