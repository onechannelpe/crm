import { createEmailComposer } from "@crm/email-composer";
import {
  createKapsoProvider,
  createMessageChannels,
  createResendProvider,
  createWhatsAppCloudProvider,
  type DeliveryProvider,
} from "@crm/message-channels";

import type { AppConfig, NotificationsConfig } from "~/lib/env";
import { JOB_CHANNELS } from "~/lib/job-queue/channels";
import type { QueueDoorbell } from "~/lib/job-queue/doorbell";
import { createMessagingGateway } from "~/server/notifications/messaging-gateway";
import { enqueueNotifications } from "~/server/notifications/outbox";
import { createNotificationProcessor } from "~/server/notifications/processor";
import { createAppNotificationRepo } from "~/server/notifications/repos/app-notification";
import type { NotificationIntent } from "~/server/notifications/types";

import type { ServerInfra } from "./infra";

export function createNotificationsRuntime(
  infra: ServerInfra,
  config: NotificationsConfig,
  app: AppConfig,
  doorbell: QueueDoorbell,
) {
  const providers: DeliveryProvider[] = [];
  if (config.resend) {
    providers.push(createResendProvider(config.resend));
  }
  if (config.kapso) {
    providers.push(
      createKapsoProvider({
        apiKey: config.kapso.apiKey,
        phoneNumberId: config.kapso.whatsappPhoneNumberId,
        metaGraphVersion: config.kapso.metaGraphVersion,
      }),
    );
  }
  if (config.whatsappCloud) {
    providers.push(createWhatsAppCloudProvider(config.whatsappCloud));
  }

  const channels = createMessageChannels({
    routes: config.routes,
    providers,
  });
  const composer = createEmailComposer();
  const messaging = createMessagingGateway({ channels, composer });

  const runProcessor = createNotificationProcessor(infra.db, messaging, {
    publicOrigin: app.publicOrigin,
  });

  return {
    messaging,
    createIntentQueue: (workerId: string) => ({
      name: "notifications-intents",
      runOnce: () => runProcessor(workerId, 50),
    }),
    dispatchPendingJobs(): void {
      doorbell.wake(JOB_CHANNELS.NOTIFICATIONS_INTENTS, Date.now());
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
