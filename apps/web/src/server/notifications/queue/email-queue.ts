import { type UserId } from "~/server/shared/ids";

import type { NotificationServiceDeps } from "../domain/types";
import { createNotificationDeliveryQueue } from "./create-delivery-queue";

interface NotificationEmailQueueDeps {
  repos: NotificationServiceDeps["repos"];
  messaging: NotificationServiceDeps["messaging"];
  leaseMs?: number;
  batchSize?: number;
  maxConcurrency?: number;
}

export function createNotificationEmailQueue(
  workerId: UserId,
  deps: NotificationEmailQueueDeps,
) {
  return createNotificationDeliveryQueue("email", workerId, {
    repos: deps.repos,
    messaging: deps.messaging,
    leaseMs: deps.leaseMs ?? 30_000,
    batchSize: deps.batchSize ?? 25,
    maxConcurrency: deps.maxConcurrency ?? 10,
  });
}
