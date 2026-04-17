import { enqueueDueCampaigns } from "./application/enqueue-due-campaigns";
import { publishCampaign } from "./application/publish-campaign";
import type {
  NotificationServiceDeps,
  PublishCampaignInput,
} from "./domain/types";

export interface NotificationCampaignService {
  publishCampaign(input: PublishCampaignInput): Promise<number>;
  enqueueDueCampaigns(limit?: number): Promise<void>;
}

export function createAppNotificationService(
  deps: NotificationServiceDeps,
): NotificationCampaignService {
  return {
    publishCampaign(input: PublishCampaignInput) {
      return publishCampaign(deps, input);
    },
    enqueueDueCampaigns(limit = 5) {
      return enqueueDueCampaigns(deps, limit);
    },
  };
}
