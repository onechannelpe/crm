import { createLogger } from "~/lib/observability/logger";
import { createNotificationDeliveryService } from "~/server/notifications/delivery-executor";
import { createNotificationPlanner } from "~/server/notifications/delivery-planner";
import { createNotificationProcessor } from "~/server/notifications/processor";
import { createAppNotificationRepo } from "~/server/notifications/repos/app-notification";
import { createNotificationDeliveryRepository } from "~/server/notifications/repos/delivery";
import { createNotificationOutboxProcessingRepository } from "~/server/notifications/repos/outbox-processing";
import { createNotificationPlanningRepository } from "~/server/notifications/repos/planning";

import { createRecordingMessagingGateway } from "../fakes/messaging-gateway";
import type { TestRuntime } from "../runtime/app";

export function createTestNotificationRuntime(runtime: TestRuntime) {
  const logger = createLogger("test-notifications");
  const messages = createRecordingMessagingGateway();
  const outbox = createNotificationOutboxProcessingRepository(runtime.ctx.db);
  const plan = createNotificationPlanner({
    repository: createNotificationPlanningRepository(runtime.ctx.db),
    logger,
  });
  const delivery = createNotificationDeliveryService({
    appNotifications: createAppNotificationRepo(runtime.ctx.db),
    deliveries: createNotificationDeliveryRepository(runtime.ctx.db),
    messaging: messages.gateway,
    publicOrigin: "https://app.example.test",
    logger,
  });
  const processor = createNotificationProcessor({
    outbox,
    plan,
    delivery,
    clock: runtime.now.get,
    logger,
  });

  return { messages, outbox, plan, processor };
}
