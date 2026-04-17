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
      max_attempts: DEFAULT_JOB_MAX_ATTEMPTS,
      available_at: now,
      lease_owner: null,
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
  const campaigns = await deps.repos.notificationCampaigns.findQueuedCampaigns(
    now,
    limit,
  );

  await Promise.all(
    campaigns.map(async (campaign) => {
      const claim = await deps.repos.notificationCampaigns.markProcessing(
        campaign.id,
      );

      if (Number(claim.numUpdatedRows ?? 0) === 0) {
        return;
      }

      try {
        const users = await deps.repos.notificationCampaigns.findAudienceUsers(
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

        await deps.repos.notificationCampaigns.markCompleted(campaign.id, now);
      } catch {
        await deps.repos.notificationCampaigns.markFailed(
          campaign.id,
          Date.now(),
        );
      }
    }),
  );
}
