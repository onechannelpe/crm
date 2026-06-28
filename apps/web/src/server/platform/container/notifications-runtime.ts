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
import type { QueueRunner } from "~/lib/job-queue/types";
import { createLogger } from "~/lib/observability/logger";
import { createMessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import { createDeliveryDispatchQueue } from "~/server/notifications/dispatch/queue";
import { createDeliverySender } from "~/server/notifications/dispatch/send-delivery";
import { createIntentExpander } from "~/server/notifications/expansion/expand-intent";
import { createRecipientPlanner } from "~/server/notifications/expansion/plan-recipients";
import { createIntentExpansionQueue } from "~/server/notifications/expansion/queue";
import { enqueueNotifications } from "~/server/notifications/intent/enqueue";
import { createAppNotificationRepo } from "~/server/notifications/repos/app-notification";
import { createDeliveryRepository } from "~/server/notifications/repos/delivery-repo";
import { createIntentRepository } from "~/server/notifications/repos/intent-repo";
import { createRecipientRepository } from "~/server/notifications/repos/recipient-repo";
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

  const logger = createLogger("notifications");
  const clock = Date.now;

  const intents = createIntentRepository(infra.db);
  const deliveries = createDeliveryRepository(infra.db);
  const appNotifications = createAppNotificationRepo(infra.db);

  const expand = createIntentExpander({
    planRecipients: createRecipientPlanner({
      repository: createRecipientRepository(infra.db),
      logger,
    }),
    appNotifications,
    deliveries,
    logger,
  });
  const send = createDeliverySender({
    messaging,
    deliveries,
    publicOrigin: app.publicOrigin,
    logger,
  });

  return {
    messaging,
    appNotifications,
    createQueues(workerId: string): {
      expansion: QueueRunner;
      dispatch: QueueRunner;
    } {
      return {
        expansion: createIntentExpansionQueue(workerId, {
          intents,
          expand,
          clock,
          onExpanded: () =>
            doorbell.wake(JOB_CHANNELS.NOTIFICATIONS_DELIVERIES, Date.now()),
        }),
        dispatch: createDeliveryDispatchQueue(workerId, {
          deliveries,
          send,
          clock,
        }),
      };
    },
    dispatchPendingJobs(): void {
      doorbell.wake(JOB_CHANNELS.NOTIFICATIONS_INTENTS, Date.now());
    },
    async enqueue(
      intentsToEnqueue: NotificationIntent[],
      now = Date.now(),
    ): Promise<void> {
      await enqueueNotifications(infra.db, intentsToEnqueue, now);
    },
  };
}
