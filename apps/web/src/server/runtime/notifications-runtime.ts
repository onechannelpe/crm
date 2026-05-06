import { createEmailComposer } from "@crm/email-composer";
import { createMessageChannels } from "@crm/message-channels";

import { getEnvFor } from "~/lib/env";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishJob } from "~/lib/redis/publisher";
import { createMessagingGateway } from "~/server/notifications/messaging-gateway";
import { createNotificationEmailQueue } from "~/server/notifications/queue/email-queue";
import { createNotificationWhatsAppQueue } from "~/server/notifications/queue/whatsapp-queue";
import { createAppNotificationRepo } from "~/server/notifications/repos/app-notification";
import { createNotificationAudienceRepo } from "~/server/notifications/repos/audience";
import { createNotificationCampaignRepo } from "~/server/notifications/repos/campaign";
import { createNotificationChannelOwnerRepo } from "~/server/notifications/repos/channel-owner";
import { createNotificationDeliveryJobRepo } from "~/server/notifications/repos/delivery-job";
import { createNotificationDeliveryLogRepo } from "~/server/notifications/repos/delivery-log";
import { createNotificationPreferenceRepo } from "~/server/notifications/repos/preference";
import { createAppNotificationService } from "~/server/notifications/service";

import type { ServerInfra } from "./infra";

export function createNotificationsRuntime(infra: ServerInfra) {
  const env = getEnvFor("notifications");
  const channels = createMessageChannels({
    resendApiKey: env.resendApiKey || undefined,
    fromEmail: env.emailFrom || undefined,
    whatsappAccessToken: env.whatsappAccessToken || undefined,
    whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
    whatsappApiVersion: env.whatsappApiVersion || undefined,
  });
  const composer = createEmailComposer();
  const messaging = createMessagingGateway({ channels, composer });

  const repos = {
    notificationCampaign: createNotificationCampaignRepo(infra.db),
    notificationAudience: createNotificationAudienceRepo(infra.db),
    notificationChannelOwners: createNotificationChannelOwnerRepo(infra.db),
    notificationPreference: createNotificationPreferenceRepo(infra.db),
    notificationDeliveryJob: createNotificationDeliveryJobRepo(infra.db),
    notificationDeliveryLog: createNotificationDeliveryLogRepo(infra.db),
  };

  return {
    messaging,
    createEmailQueue: (workerId: string) =>
      createNotificationEmailQueue(workerId, {
        repos,
        messaging,
      }),
    createWhatsAppQueue: (workerId: string) =>
      createNotificationWhatsAppQueue(workerId, {
        repos,
        messaging,
      }),
    async dispatchPendingJobs(): Promise<void> {
      await Promise.all([
        publishJob(JOB_CHANNELS.NOTIFICATIONS_EMAIL, Date.now()),
        publishJob(JOB_CHANNELS.NOTIFICATIONS_WHATSAPP, Date.now()),
      ]);
    },
    service: createAppNotificationService({
      repos,
      messaging,
      logger: infra.logger,
    }),
    appNotifications: createAppNotificationRepo(infra.db),
  };
}
