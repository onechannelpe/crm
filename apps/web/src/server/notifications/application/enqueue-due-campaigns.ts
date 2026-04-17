import type { NotificationServiceDeps } from "../domain/types";

const DEFAULT_JOB_MAX_ATTEMPTS = 5;
const AUDIENCE_PAGE_SIZE = 250;

export type AudiencePageLoader = (
  afterUserId: number,
  limit: number,
) => Promise<number[]>;

export type BatchProvisioner = (userIds: number[]) => Promise<void>;

export async function enqueueCampaignAudience(
  loadPage: AudiencePageLoader,
  provisionBatch: BatchProvisioner,
): Promise<void> {
  let lastUserId = 0;
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const userIds = await loadPage(lastUserId, AUDIENCE_PAGE_SIZE);

    if (userIds.length === 0) break;

    // eslint-disable-next-line no-await-in-loop
    await provisionBatch(userIds);
    lastUserId = userIds[userIds.length - 1];
  }
}

async function processCampaign(
  deps: Pick<NotificationServiceDeps, "repos" | "logger">,
  campaign: {
    id: number;
    event_type: string;
    audience_type: "user" | "role" | "global";
    audience_ref: string | null;
  },
  now: number,
) {
  const claim = await deps.repos.notificationCampaign.markProcessing(
    campaign.id,
  );

  if (Number(claim.numUpdatedRows ?? 0) === 0) {
    return;
  }

  try {
    const loadPage: AudiencePageLoader = (afterUserId, limit) =>
      deps.repos.notificationAudience
        .findAudienceMembersPage(
          campaign.audience_type,
          campaign.audience_ref,
          afterUserId,
          limit,
        )
        .then((users) => users.map((u) => u.id));

    const provisionBatch: BatchProvisioner = async (userIds) => {
      // Recipients must be committed before job creation: createPendingJobsForCampaignUsers
      // does an INSERT...SELECT from notification_recipients to resolve recipient IDs.
      await Promise.all([
        deps.repos.notificationDeliveryLog.createRecipientsForEmailUsers({
          campaignId: campaign.id,
          eventType: campaign.event_type,
          userIds,
          createdAt: now,
        }),
        deps.repos.notificationDeliveryLog.createRecipientsForWhatsAppUsers({
          campaignId: campaign.id,
          eventType: campaign.event_type,
          userIds,
          createdAt: now,
        }),
      ]);

      await deps.repos.notificationDeliveryJob.createPendingJobsForCampaignUsers(
        {
          campaignId: campaign.id,
          userIds,
          createdAt: now,
          maxAttempts: DEFAULT_JOB_MAX_ATTEMPTS,
        },
      );
    };

    await enqueueCampaignAudience(loadPage, provisionBatch);

    await deps.repos.notificationCampaign.markCompleted(campaign.id, now);
  } catch (error) {
    deps.logger.error("notification_campaign_enqueue_failed", {
      campaignId: campaign.id,
      eventType: campaign.event_type,
      error,
    });
    await deps.repos.notificationCampaign.markFailed(campaign.id, Date.now());
  }
}

export async function enqueueDueCampaigns(
  deps: Pick<NotificationServiceDeps, "repos" | "logger">,
  limit = 5,
): Promise<void> {
  const now = Date.now();
  const campaigns = await deps.repos.notificationCampaign.findQueuedCampaigns(
    now,
    limit,
  );

  await Promise.all(
    campaigns.map((campaign) => processCampaign(deps, campaign, now)),
  );
}
