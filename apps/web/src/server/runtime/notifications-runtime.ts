import { createNotificationService } from "@crm/notifications";

import { env } from "~/lib/env";
import { createAppNotificationsRepo } from "~/server/notifications/repos-app-notifications";
import { createNotificationCampaignsRepo } from "~/server/notifications/repos-campaigns";
import { createNotificationContactsRepo } from "~/server/notifications/repos-contacts";
import { createNotificationPreferencesRepo } from "~/server/notifications/repos-preferences";
import { createAppNotificationService } from "~/server/notifications/service";

import type { ServerInfra } from "./infra";

export function createNotificationsRuntime(infra: ServerInfra) {
  const notificationSender = createNotificationService({
    resendApiKey: env.resendApiKey || undefined,
    fromEmail: env.emailFrom || undefined,
    whatsappAccessToken: env.whatsappAccessToken || undefined,
    whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
    whatsappApiVersion: env.whatsappApiVersion || undefined,
  });

  const campaignRepos = {
    notificationCampaigns: createNotificationCampaignsRepo(infra.db),
    notificationContacts: createNotificationContactsRepo(infra.db),
    notificationPreferences: createNotificationPreferencesRepo(infra.db),
  };

  return {
    notificationSender,
    service: createAppNotificationService({
      repos: campaignRepos,
      config: {
        resendApiKey: env.resendApiKey || undefined,
        fromEmail: env.emailFrom || undefined,
        whatsappAccessToken: env.whatsappAccessToken || undefined,
        whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
        whatsappApiVersion: env.whatsappApiVersion || undefined,
      },
    }),
    appNotifications: createAppNotificationsRepo(infra.db),
  };
}
