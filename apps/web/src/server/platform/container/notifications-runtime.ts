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
import { createLogger } from "~/lib/observability/logger";
import { createNotificationDeliveryService } from "~/server/notifications/delivery-executor";
import { createNotificationPlanner } from "~/server/notifications/delivery-planner";
import { createMessagingGateway } from "~/server/notifications/messaging-gateway";
import { enqueueNotifications } from "~/server/notifications/outbox";
import { createNotificationProcessor } from "~/server/notifications/processor";
import { createAppNotificationRepo } from "~/server/notifications/repos/app-notification";
import { createNotificationDeliveryRepository } from "~/server/notifications/repos/delivery";
import { createNotificationOutboxProcessingRepository } from "~/server/notifications/repos/outbox-processing";
import { createNotificationPlanningRepository } from "~/server/notifications/repos/planning";
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

  const logger = createLogger("notifications-processor");
  const planner = createNotificationPlanner({
    repository: createNotificationPlanningRepository(infra.db),
    logger,
  });
  const delivery = createNotificationDeliveryService({
    appNotifications: createAppNotificationRepo(infra.db),
    deliveries: createNotificationDeliveryRepository(infra.db),
    messaging,
    publicOrigin: app.publicOrigin,
    logger,
  });
  const processor = createNotificationProcessor({
    outbox: createNotificationOutboxProcessingRepository(infra.db),
    plan: planner,
    delivery,
    clock: Date.now,
    logger,
  });

  return {
    messaging,
    createIntentQueue: (workerId: string) => ({
      name: "notifications-intents",
      runOnce: () => processor.runOnce(workerId, 50),
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
