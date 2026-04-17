import type { UsersTable } from "~/lib/db/types";

import type { NotificationServiceDeps } from "../domain/types";

const DEFAULT_JOB_MAX_ATTEMPTS = 5;

async function enqueueUserChannels(
  repos: NotificationServiceDeps["repos"],
  user: { id: number; email: string; role: UsersTable["role"] },
  campaignId: number,
  eventType: string,
  now: number,
): Promise<void> {
  const emailEnabled = await repos.notificationPreference.isEnabled({
    userId: user.id,
    eventType,
    channel: "email",
  });

  if (emailEnabled) {
    const emailContact =
      await repos.notificationContact.findPrimaryVerifiedByUserAndChannel(
        user.id,
        "email",
      );
    const recipientId = await repos.notificationDeliveryLog.createRecipient({
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

    await repos.notificationDeliveryJob.createJob({
      recipient_id: recipientId,
      status: "pending",
      attempt_count: 0,
      max_attempts: DEFAULT_JOB_MAX_ATTEMPTS,
      available_at: now,
      lease_owner: null,
      lease_until: null,
      last_error: null,
      created_at: now,
      updated_at: now,
    });
  }

  const whatsappEnabled = await repos.notificationPreference.isEnabled({
    userId: user.id,
    eventType,
    channel: "whatsapp",
  });

  if (!whatsappEnabled) {
    return;
  }

  const whatsappContact =
    await repos.notificationContact.findPrimaryVerifiedByUserAndChannel(
      user.id,
      "whatsapp",
    );

  if (!whatsappContact) {
    return;
  }

  const recipientId = await repos.notificationDeliveryLog.createRecipient({
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

  await repos.notificationDeliveryJob.createJob({
    recipient_id: recipientId,
    status: "pending",
    attempt_count: 0,
    max_attempts: DEFAULT_JOB_MAX_ATTEMPTS,
    available_at: now,
    lease_owner: null,
    lease_until: null,
    last_error: null,
    created_at: now,
    updated_at: now,
  });
}

export async function enqueueDueCampaigns(
  deps: NotificationServiceDeps,
  limit = 5,
): Promise<void> {
  const now = Date.now();
  const campaigns = await deps.repos.notificationCampaign.findQueuedCampaigns(
    now,
    limit,
  );

  await Promise.all(
    campaigns.map(async (campaign) => {
      const claim = await deps.repos.notificationCampaign.markProcessing(
        campaign.id,
      );

      if (Number(claim.numUpdatedRows ?? 0) === 0) {
        return;
      }

      try {
        const users = await deps.repos.notificationAudience.findAudienceMembers(
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

        await deps.repos.notificationCampaign.markCompleted(campaign.id, now);
      } catch (error) {
        deps.logger.error("notification_campaign_enqueue_failed", {
          campaignId: campaign.id,
          eventType: campaign.event_type,
          audienceType: campaign.audience_type,
          audienceRef: campaign.audience_ref,
          error,
        });
        await deps.repos.notificationCampaign.markFailed(
          campaign.id,
          Date.now(),
        );
      }
    }),
  );
}
