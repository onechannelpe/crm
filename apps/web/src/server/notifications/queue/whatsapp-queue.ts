import { type UserId } from "~/server/shared/ids";

import type { NotificationServiceDeps } from "../domain/types";
import { createNotificationDeliveryQueue } from "./create-delivery-queue";

interface NotificationWhatsAppQueueDeps {
  repos: NotificationServiceDeps["repos"];
  messaging: NotificationServiceDeps["messaging"];
  leaseMs?: number;
  batchSize?: number;
  maxConcurrency?: number;
}

export function createNotificationWhatsAppQueue(
  workerId: UserId,
  deps: NotificationWhatsAppQueueDeps,
) {
  return createNotificationDeliveryQueue("whatsapp", workerId, {
    repos: deps.repos,
    messaging: deps.messaging,
    leaseMs: deps.leaseMs ?? 30_000,
    batchSize: deps.batchSize ?? 10,
    maxConcurrency: deps.maxConcurrency ?? 5,
  });
}
