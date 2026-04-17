import { enqueueDueCampaigns } from "./application/enqueue-due-campaigns";
import { publishCampaign } from "./application/publish-campaign";
import type {
  NotificationServiceDeps,
  PublishCampaignInput,
} from "./domain/types";

export type NotificationService = ReturnType<
  typeof createAppNotificationService
>;

export function createAppNotificationService(deps: NotificationServiceDeps) {
  return {
    publishCampaign(input: PublishCampaignInput): Promise<number> {
      return publishCampaign(deps, input);
    },
    enqueueDueCampaigns(limit = 5): Promise<void> {
      return enqueueDueCampaigns(deps, limit);
    },
  };
}
