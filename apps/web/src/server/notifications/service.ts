import type { NotificationsConfig } from "@crm/notifications";
import { createNotificationService } from "@crm/notifications";

import type { UsersTable } from "~/lib/db/schema";
import type { Repositories } from "~/server/shared/registry";

const LEASE_MS = 30_000;
const MAX_ATTEMPTS = 5;
const EMAIL_BATCH_SIZE = 25;
const WHATSAPP_BATCH_SIZE = 10;

function nextBackoffMs(attemptCount: number): number {
  const base = Math.min(2 ** attemptCount * 1000, 60_000);
  const jitter = Math.floor(Math.random() * 500);
  return base + jitter;
}

function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("429") ||
    message.includes("rate") ||
    message.includes("timeout") ||
    message.includes("temporar")
  );
}

export interface PublishCampaignInput {
  type: "security_event" | "broadcast";
  eventType: string;
  audienceType: "user" | "role" | "global";
  audienceRef: string | null;
  title: string | null;
  bodyText: string;
  createdByUserId: number | null;
  scheduledAt?: number | null;
}

export interface NotificationServiceDeps {
  repos: Pick<
    Repositories,
    "notificationCampaigns" | "notificationContacts" | "notificationPreferences"
  >;
  config: NotificationsConfig;
}

export function createAppNotificationService(deps: NotificationServiceDeps) {
  const sender = createNotificationService(deps.config);

  return {
    async publishCampaign(input: PublishCampaignInput): Promise<number> {
      return deps.repos.notificationCampaigns.createCampaign({
        type: input.type,
        event_type: input.eventType,
        audience_type: input.audienceType,
        audience_ref: input.audienceRef,
        title: input.title,
        body_text: input.bodyText,
        created_by_user_id: input.createdByUserId,
        status: "queued",
        scheduled_at: input.scheduledAt ?? null,
        created_at: Date.now(),
        processed_at: null,
      });
    },

    async enqueueDueCampaigns(limit = 5): Promise<void> {
      const now = Date.now();
      const campaigns =
        await deps.repos.notificationCampaigns.findQueuedCampaigns(now, limit);
      await Promise.all(
        campaigns.map(async (campaign) => {
          const claim = await deps.repos.notificationCampaigns.markProcessing(
            campaign.id,
          );

          if (Number(claim.numUpdatedRows ?? 0) === 0) {
            return;
          }

          try {
            const users =
              await deps.repos.notificationCampaigns.findAudienceUsers(
                campaign.audience_type,
                campaign.audience_ref,
              );

            await Promise.all(
              users.map((user) =>
                enqueueUserChannels(
                  deps.repos,
                  {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                  },
                  campaign.id,
                  campaign.event_type,
                  now,
                ),
              ),
            );

            await deps.repos.notificationCampaigns.markCompleted(
              campaign.id,
              now,
            );
          } catch {
            await deps.repos.notificationCampaigns.markFailed(
              campaign.id,
              Date.now(),
            );
          }
        }),
      );
    },

    async processPendingJobs(limit = 50): Promise<void> {
      const now = Date.now();
      const jobs = await deps.repos.notificationCampaigns.findPendingJobs(
        now,
        limit,
      );
      const emailJobs = jobs
        .filter((job) => job.channel === "email")
        .slice(0, EMAIL_BATCH_SIZE);
      const whatsappJobs = jobs
        .filter((job) => job.channel === "whatsapp")
        .slice(0, WHATSAPP_BATCH_SIZE);

      await Promise.all(
        [...emailJobs, ...whatsappJobs].map(async (job) => {
          const leased = await deps.repos.notificationCampaigns.leaseJob(
            job.jobId,
            Date.now() + LEASE_MS,
          );

          if (Number(leased.numUpdatedRows ?? 0) === 0) {
            return;
          }

          const startedAt = Date.now();

          try {
            await sender.send({
              channel: job.channel,
              to: job.address,
              subject: job.title ?? undefined,
              text: job.bodyText,
            });

            const sentAt = Date.now();
            await deps.repos.notificationCampaigns.markJobSent(job.jobId);
            await deps.repos.notificationCampaigns.markRecipientSent(
              job.recipientId,
              sentAt,
            );
            await deps.repos.notificationCampaigns.createDelivery({
              recipient_id: job.recipientId,
              provider: job.channel === "email" ? "resend" : "whatsapp_cloud",
              provider_message_id: null,
              status: "sent",
              error_code: null,
              error_message: null,
              latency_ms: sentAt - startedAt,
              created_at: sentAt,
            });
          } catch (error) {
            await handleJobError(deps.repos, job, error, startedAt);
          }
        }),
      );
    },
  };
}

async function enqueueUserChannels(
  repos: NotificationServiceDeps["repos"],
  user: { id: number; email: string; role: UsersTable["role"] },
  campaignId: number,
  eventType: string,
  now: number,
): Promise<void> {
  const emailEnabled = await repos.notificationPreferences.isEnabled({
    userId: user.id,
    eventType,
    channel: "email",
  });

  if (emailEnabled) {
    const emailContact =
      await repos.notificationContacts.findPrimaryVerifiedByUserAndChannel(
        user.id,
        "email",
      );
    const recipientId = await repos.notificationCampaigns.createRecipient({
      campaign_id: campaignId,
      user_id: user.id,
      channel: "email",
      address: emailContact?.address ?? user.email,
      status: "pending",
      status_reason: null,
      created_at: now,
      sent_at: null,
      failed_at: null,
    });

    await repos.notificationCampaigns.createJob({
      recipient_id: recipientId,
      status: "pending",
      attempt_count: 0,
      available_at: now,
      lease_until: null,
      last_error: null,
      created_at: now,
      updated_at: now,
    });
  }

  const whatsappEnabled = await repos.notificationPreferences.isEnabled({
    userId: user.id,
    eventType,
    channel: "whatsapp",
  });

  if (!whatsappEnabled) {
    return;
  }

  const whatsappContact =
    await repos.notificationContacts.findPrimaryVerifiedByUserAndChannel(
      user.id,
      "whatsapp",
    );

  if (!whatsappContact) {
    return;
  }

  const recipientId = await repos.notificationCampaigns.createRecipient({
    campaign_id: campaignId,
    user_id: user.id,
    channel: "whatsapp",
    address: whatsappContact.address,
    status: "pending",
    status_reason: null,
    created_at: now,
    sent_at: null,
    failed_at: null,
  });

  await repos.notificationCampaigns.createJob({
    recipient_id: recipientId,
    status: "pending",
    attempt_count: 0,
    available_at: now,
    lease_until: null,
    last_error: null,
    created_at: now,
    updated_at: now,
  });
}

async function handleJobError(
  repos: NotificationServiceDeps["repos"],
  job: {
    jobId: number;
    recipientId: number;
    attemptCount: number;
    channel: "email" | "whatsapp";
  },
  error: unknown,
  startedAt: number,
): Promise<void> {
  const message = error instanceof Error ? error.message : "unknown error";
  const attemptCount = job.attemptCount + 1;

  if (attemptCount >= MAX_ATTEMPTS || !isTransientError(error)) {
    const failedAt = Date.now();
    await repos.notificationCampaigns.markJobFailed(
      job.jobId,
      message,
      attemptCount,
    );
    await repos.notificationCampaigns.markRecipientFailed(
      job.recipientId,
      failedAt,
      message,
    );
    await repos.notificationCampaigns.createDelivery({
      recipient_id: job.recipientId,
      provider: job.channel === "email" ? "resend" : "whatsapp_cloud",
      provider_message_id: null,
      status: "failed",
      error_code: "send_failed",
      error_message: message,
      latency_ms: failedAt - startedAt,
      created_at: failedAt,
    });
    return;
  }

  await repos.notificationCampaigns.scheduleJobRetry({
    jobId: job.jobId,
    attemptCount,
    availableAt: Date.now() + nextBackoffMs(attemptCount),
    error: message,
  });
}
