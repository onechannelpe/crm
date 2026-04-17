import type { MessagingGateway } from "../messaging-gateway";
import type { createNotificationAudienceRepo } from "../repos/audience";
import type { createNotificationCampaignRepo } from "../repos/campaign";
import type { createNotificationContactRepo } from "../repos/contact";
import type { createNotificationDeliveryJobRepo } from "../repos/delivery-job";
import type { createNotificationDeliveryLogRepo } from "../repos/delivery-log";
import type { createNotificationPreferenceRepo } from "../repos/preference";

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
  repos: {
    notificationCampaign: ReturnType<typeof createNotificationCampaignRepo>;
    notificationAudience: ReturnType<typeof createNotificationAudienceRepo>;
    notificationContact: ReturnType<typeof createNotificationContactRepo>;
    notificationPreference: ReturnType<typeof createNotificationPreferenceRepo>;
    notificationDeliveryJob: ReturnType<
      typeof createNotificationDeliveryJobRepo
    >;
    notificationDeliveryLog: ReturnType<
      typeof createNotificationDeliveryLogRepo
    >;
  };
  messaging: MessagingGateway;
}
