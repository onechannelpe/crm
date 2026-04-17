import type { NotificationServiceDeps } from "../domain/types";

const DEFAULT_JOB_MAX_ATTEMPTS = 5;
const AUDIENCE_PAGE_SIZE = 250;

async function enqueueCampaignAudience(
  deps: NotificationServiceDeps,
  campaign: Awaited<
    ReturnType<
      NotificationServiceDeps["repos"]["notificationCampaign"]["findQueuedCampaigns"]
    >
  >[number],
  now: number,
): Promise<void> {
  let lastUserId = 0;

  while (true) {
    const users = await deps.repos.notificationAudience.findAudienceMembersPage(
      campaign.audience_type,
      campaign.audience_ref,
      lastUserId,
      AUDIENCE_PAGE_SIZE,
    );

    if (users.length === 0) {
      return;
    }

    const userIds = users.map((user) => user.id);

    await deps.repos.notificationDeliveryLog.createRecipientsForEmailUsers({
      campaignId: campaign.id,
      eventType: campaign.event_type,
      userIds,
      createdAt: now,
    });

    await deps.repos.notificationDeliveryLog.createRecipientsForWhatsAppUsers({
      campaignId: campaign.id,
      eventType: campaign.event_type,
      userIds,
      createdAt: now,
    });

    await deps.repos.notificationDeliveryJob.createPendingJobsForCampaignUsers({
      campaignId: campaign.id,
      userIds,
      createdAt: now,
      maxAttempts: DEFAULT_JOB_MAX_ATTEMPTS,
    });

    const lastUser = users[users.length - 1];
    if (!lastUser) {
      return;
    }

    lastUserId = lastUser.id;
  }
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
        await enqueueCampaignAudience(deps, campaign, now);
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
