import type {
  NotificationServiceDeps,
  PublishCampaignInput,
} from "../domain/types";

export async function publishCampaign(
  deps: NotificationServiceDeps,
  input: PublishCampaignInput,
): Promise<number> {
  return deps.repos.notificationCampaign.createCampaign({
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
}
