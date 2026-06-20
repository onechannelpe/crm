import { createEmailComposer } from "@crm/email-composer";
import { createMessageChannels } from "@crm/message-channels";

import type { NotificationsConfig } from "~/lib/env";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import { publishMessage } from "~/lib/redis/publisher";
import { createMessagingGateway } from "~/server/notifications/messaging-gateway";
import { enqueueNotifications } from "~/server/notifications/outbox";
import { createNotificationProcessor } from "~/server/notifications/processor";
import { createAppNotificationRepo } from "~/server/notifications/repos/app-notification";
import type { NotificationIntent } from "~/server/notifications/types";

import type { ServerInfra } from "./infra";

export function createNotificationsRuntime(
  infra: ServerInfra,
  config: NotificationsConfig,
) {
  const channels = createMessageChannels({
    resendApiKey: config.resendApiKey || undefined,
    fromEmail: config.emailFrom || undefined,
    whatsappAccessToken: config.whatsappAccessToken || undefined,
    whatsappPhoneNumberId: config.whatsappPhoneNumberId || undefined,
    whatsappApiVersion: config.whatsappApiVersion || undefined,
  });
  const composer = createEmailComposer();
  const messaging = createMessagingGateway({ channels, composer });

  const runProcessor = createNotificationProcessor(infra.db, messaging);

  return {
    messaging,
    createIntentQueue: (workerId: string) => ({
      name: "notifications-intents",
      runOnce: () => runProcessor(workerId, 50),
    }),
    async dispatchPendingJobs(): Promise<void> {
      await publishMessage(JOB_CHANNELS.NOTIFICATIONS_INTENTS, Date.now());
    },
    async enqueue(
      intents: NotificationIntent[],
      now = Date.now(),
    ): Promise<void> {
      await enqueueNotifications(infra.db, intents, now);
    },
    appNotifications: createAppNotificationRepo(infra.db),
  };
}
