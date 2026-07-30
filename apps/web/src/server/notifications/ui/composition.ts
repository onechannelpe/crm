import { createEmailComposer } from "@crm/email-composer";
import {
  createKapsoProvider,
  createLogProvider,
  createMessageChannels,
  createResendProvider,
  createWhatsAppCloudProvider,
  type DeliveryProvider,
} from "@crm/message-channels";
import type { Kysely } from "kysely";

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
import { createOutboundWhatsAppQueue } from "~/server/notifications/outbound/queue";
import { createAppNotificationRepo } from "~/server/notifications/repos/app-notification";
import { createDeliveryRepository } from "~/server/notifications/repos/delivery-repo";
import { createIntentRepository } from "~/server/notifications/repos/intent-repo";
import {
  createNotificationOptOutRepo,
  type NotificationOptOutRepo,
} from "~/server/notifications/repos/opt-out-repo";
import type { NotificationIntent } from "~/server/notifications/types";
import { createWhatsAppInboundQueue } from "~/server/notifications/whatsapp-inbound/queue";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";
import {
  appConfig,
  notificationsConfig,
  type AppConfig,
  type NotificationsConfig,
} from "~/server/platform/config/env";
import { notify } from "~/server/platform/database/notify";
import type { Database } from "~/server/platform/database/types";
import { JOB_TABLE_CHANNELS } from "~/server/platform/jobs/registry";
import type { QueueRunner } from "~/server/platform/jobs/types";
import type { Logger } from "~/shared/observability/logger";
import { createLogger } from "~/shared/observability/runtime-logger";

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
  preferences: NotificationOptOutRepo;
  createQueues(workerId: string): {
    expansion: QueueRunner;
    dispatch: QueueRunner;
    whatsappInbound: QueueRunner;
    outboundWhatsApp: QueueRunner;
  };
  enqueue(intents: NotificationIntent[], now?: Date): Promise<void>;
}

export function assembleNotificationPipeline(
  deps: NotificationPipelineDeps,
): NotificationPipeline {
  const intents = createIntentRepository(deps.db);
  const deliveries = createDeliveryRepository(deps.db);
  const appNotifications = createAppNotificationRepo(deps.db);
  const preferences = createNotificationOptOutRepo(deps.db);

  const expand = createIntentExpander({
    planRecipients: createRecipientPlanner(deps.db, deps.logger),
    appNotifications,
    deliveries,
    logger: deps.logger,
  });
  const send = createDeliverySender({
    messaging: deps.messaging,
    publicOrigin: deps.publicOrigin,
    logger: deps.logger,
  });

  return {
    messaging: deps.messaging,
    appNotifications,
    preferences,
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
        whatsappInbound: createWhatsAppInboundQueue(
          deps.db,
          workerId,
          deps.clock,
        ),
        outboundWhatsApp: createOutboundWhatsAppQueue(
          deps.db,
          deps.messaging,
          workerId,
          deps.clock,
        ),
      };
    },
    enqueue(intentsToEnqueue, now = deps.clock()) {
      return enqueueNotifications(deps.db, intentsToEnqueue, now);
    },
  };
}

export function createNotificationsRuntime(
  serverInfrastructure: ServerInfrastructure,
  config: NotificationsConfig,
  app: AppConfig,
): NotificationPipeline {
  const logger = createLogger("notifications");
  const providers: DeliveryProvider[] = [];
  if (config.resend) {
    providers.push(createResendProvider(config.resend));
  }

  if (Object.values(config.routes).includes("log")) {
    // `log` route: write the composed email to the log instead of sending it,
    // for dev and e2e. Invite links no longer depend on capturing this output;
    // they are retrievable from the invite record and its copy-link.
    providers.push(
      createLogProvider((mail) => {
        logger.info("email.logged", {
          to: mail.to,
          subject: mail.subject,
          text: mail.text,
        });
      }),
    );
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
    db: serverInfrastructure.db,
    messaging,
    clock: () => new Date(),
    publicOrigin: app.publicOrigin,
    logger,
  });
}

export function composeNotifications() {
  return createNotificationsRuntime(
    serverInfrastructure,
    notificationsConfig(),
    appConfig(),
  );
}
