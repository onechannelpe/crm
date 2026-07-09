import { createEmailComposer } from "@crm/email-composer";
import {
  createKapsoProvider,
  createMessageChannels,
  createResendProvider,
  createWhatsAppCloudProvider,
  type DeliveryProvider,
} from "@crm/message-channels";
import type { Kysely } from "kysely";

import { notify } from "~/lib/db/notify";
import type { Database } from "~/lib/db/types";
import type { AppConfig, NotificationsConfig } from "~/lib/env";
import { JOB_TABLE_CHANNELS } from "~/lib/job-queue/registry";
import type { QueueRunner } from "~/lib/job-queue/types";
import { createLogger } from "~/lib/observability/logger";
import type { Logger } from "~/lib/observability/logger-shared";
import {
  createMessagingGateway,
  type MessagingGateway,
} from "~/server/notifications/channels/messaging-gateway";
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

// Wires expansion and dispatch through injected clock and messaging ports.
// Config adapter and test harness both build through this, so the two cannot
// drift.
export interface NotificationPipelineDeps {
  db: Kysely<Database>;
  messaging: MessagingGateway;
  clock: () => Date;
  publicOrigin: string;
  logger: Logger;
}

export interface NotificationPipeline {
  messaging: MessagingGateway;
  appNotifications: ReturnType<typeof createAppNotificationRepo>;
  createQueues(workerId: string): {
    expansion: QueueRunner;
    dispatch: QueueRunner;
  };
  enqueue(intents: NotificationIntent[], now?: Date): Promise<void>;
}

export function assembleNotificationPipeline(
  deps: NotificationPipelineDeps,
): NotificationPipeline {
  const intents = createIntentRepository(deps.db);
  const deliveries = createDeliveryRepository(deps.db);
  const appNotifications = createAppNotificationRepo(deps.db);

  const expand = createIntentExpander({
    planRecipients: createRecipientPlanner({
      repository: createRecipientRepository(deps.db),
      logger: deps.logger,
    }),
    appNotifications,
    deliveries,
    logger: deps.logger,
  });
  const send = createDeliverySender({
    messaging: deps.messaging,
    deliveries,
    publicOrigin: deps.publicOrigin,
    logger: deps.logger,
  });

  return {
    messaging: deps.messaging,
    appNotifications,
    createQueues(workerId) {
      return {
        expansion: createIntentExpansionQueue(workerId, {
          intents,
          expand,
          clock: deps.clock,
          onExpanded: () =>
            notify(deps.db, JOB_TABLE_CHANNELS.notification_deliveries),
        }),
        dispatch: createDeliveryDispatchQueue(workerId, {
          deliveries,
          send,
          clock: deps.clock,
        }),
      };
    },
    enqueue(intentsToEnqueue, now = deps.clock()) {
      return enqueueNotifications(deps.db, intentsToEnqueue, now);
    },
  };
}

// Builds the provider-backed messaging gateway from env config and hands
// real-clock dependencies to assembleNotificationPipeline.
export function createNotificationsRuntime(
  infra: ServerInfra,
  config: NotificationsConfig,
  app: AppConfig,
): NotificationPipeline {
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

  const channels = createMessageChannels({ routes: config.routes, providers });
  const messaging = createMessagingGateway({
    channels,
    composer: createEmailComposer(),
  });

  return assembleNotificationPipeline({
    db: infra.db,
    messaging,
    clock: () => new Date(),
    publicOrigin: app.publicOrigin,
    logger: createLogger("notifications"),
  });
}
