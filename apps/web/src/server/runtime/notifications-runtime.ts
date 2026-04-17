import { createEmailComposer } from "@crm/email-composer";
import { createMessageChannels } from "@crm/message-channels";

import { env } from "~/lib/env";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishJob } from "~/lib/redis/publisher";
import { createMessagingGateway } from "~/server/notifications/messaging-gateway";
import { createNotificationEmailQueue } from "~/server/notifications/queue/email-queue";
import { createNotificationWhatsAppQueue } from "~/server/notifications/queue/whatsapp-queue";
import { createAppNotificationsRepo } from "~/server/notifications/repos-app-notifications";
import { createNotificationCampaignsRepo } from "~/server/notifications/repos-campaigns";
import { createNotificationContactsRepo } from "~/server/notifications/repos-contacts";
import { createNotificationPreferencesRepo } from "~/server/notifications/repos-preferences";
import { createAppNotificationService } from "~/server/notifications/service";

import type { ServerInfra } from "./infra";

export function createNotificationsRuntime(infra: ServerInfra) {
  const channels = createMessageChannels({
    resendApiKey: env.resendApiKey || undefined,
    fromEmail: env.emailFrom || undefined,
    whatsappAccessToken: env.whatsappAccessToken || undefined,
    whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
    whatsappApiVersion: env.whatsappApiVersion || undefined,
  });
  const composer = createEmailComposer();
  const messaging = createMessagingGateway({ channels, composer });

  const campaignRepos = {
    notificationCampaigns: createNotificationCampaignsRepo(infra.db),
    notificationContacts: createNotificationContactsRepo(infra.db),
    notificationPreferences: createNotificationPreferencesRepo(infra.db),
  };

  return {
    messaging,
    createEmailQueue: (workerId: string) =>
      createNotificationEmailQueue(workerId, {
        repos: campaignRepos,
        messaging,
      }),
    createWhatsAppQueue: (workerId: string) =>
      createNotificationWhatsAppQueue(workerId, {
        repos: campaignRepos,
        messaging,
      }),
    async dispatchPendingJobs(): Promise<void> {
      await Promise.all([
        publishJob(JOB_CHANNELS.NOTIFICATIONS_EMAIL, Date.now()),
        publishJob(JOB_CHANNELS.NOTIFICATIONS_WHATSAPP, Date.now()),
      ]);
    },
    service: createAppNotificationService({
      repos: campaignRepos,
      messaging,
    }),
    appNotifications: createAppNotificationsRepo(infra.db),
  };
}
