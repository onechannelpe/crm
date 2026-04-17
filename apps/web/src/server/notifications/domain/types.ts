import type { UsersTable } from "~/lib/db/types";

import type { MessagingGateway } from "../messaging-gateway";
import type { createNotificationCampaignsRepo } from "../repos-campaigns";
import type { createNotificationContactsRepo } from "../repos-contacts";
import type { createNotificationPreferencesRepo } from "../repos-preferences";

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
    notificationCampaigns: ReturnType<typeof createNotificationCampaignsRepo>;
    notificationContacts: ReturnType<typeof createNotificationContactsRepo>;
    notificationPreferences: ReturnType<
      typeof createNotificationPreferencesRepo
    >;
  };
  messaging: MessagingGateway;
}

export interface NotificationAudienceUser {
  id: number;
  email: string;
  role: UsersTable["role"];
}
